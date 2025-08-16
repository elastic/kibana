/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { NodePath, traverse } from '@babel/core';
import * as t from '@babel/types';
import { codeFrameColumns } from '@babel/code-frame';
import { Export, Import, ImportExportEdge, ItemName } from './types';
import { getDependencyTraverseOptions } from '../traverse/get_dependency_traverse_options';
import { createExportEdge, createImportEdge } from './helpers';

export function extractEdges(
  filePath: string,
  { ast, code }: { ast: t.File; code: string },
  resolver: (specifier: string) => string | null
): ImportExportEdge[] {
  const edges: ImportExportEdge[] = [];

  function resolveOrThrow(path: NodePath<any>, source: string) {
    try {
      const resolved = resolver(source);
      if (resolved === null) {
        return source;
      }
      return resolved;
    } catch (error) {
      throw new Error(
        codeFrameColumns(code, path.node.loc, {
          message: `Could not resolve ${source} from ${filePath}`,
        }),
        {
          cause: error,
        }
      );
    }
  }

  function extractEdge(path: NodePath<any>, edge: ImportExportEdge) {
    if (edge.import) {
      edge.import.path = resolveOrThrow(path, edge.import.path);
    }
    edges.push(edge);
  }

  traverse(
    ast,
    getDependencyTraverseOptions({
      RequireExpression(path) {
        const importSource = path.node.arguments[0].value;
        extractEdge(
          path,
          createImportEdge({
            local: null,
            import: {
              name: null,
              path: importSource,
            },
          })
        );
      },
      DynamicImportExpression(path) {
        const importSource = path.node.arguments[0].value;
        extractEdge(
          path,
          createImportEdge({
            local: null,
            import: {
              name: null,
              path: resolveOrThrow(path, importSource),
            },
          })
        );
      },
      /**
       * Handles destructuring of require() calls like:
       *   const { foo, bar: baz } = require('module');
       */
      RequireDeclaration(path) {
        path.node.declarations.forEach((declarator) => {
          const source = declarator.init.arguments[0].value;

          declarator.id.properties.forEach((prop) => {
            if (t.isObjectProperty(prop)) {
              const importedName = prop.key.name;

              let localName: string | null = null;
              if (t.isIdentifier(prop.value)) {
                localName = prop.value.name;
              } else if (t.isAssignmentPattern(prop.value) && t.isIdentifier(prop.value.left)) {
                localName = prop.value.left.name;
              }
              extractEdge(
                path,
                createImportEdge({
                  import: {
                    path: source,
                    name: importedName,
                  },
                  local: localName,
                })
              );
            }
          });
        });
      },
      /**
       * Handles destructuring of dynamic import() calls like:
       *   const { foo } = await import('module');
       * Note: technically this pattern requires `await` but we'll still match CallExpression.
       */
      DynamicImportDeclaration(path) {
        path.node.declarations.forEach((declarator) => {
          const callExpression = t.isAwaitExpression(declarator.init)
            ? declarator.init.argument
            : declarator.init;

          const source = callExpression.arguments[0].value;

          declarator.id.properties.forEach((prop) => {
            if (t.isObjectProperty(prop)) {
              const importedName = prop.key.name;

              let localName: string | null = null;
              if (t.isIdentifier(prop.value)) {
                localName = prop.value.name;
              } else if (t.isAssignmentPattern(prop.value) && t.isIdentifier(prop.value.left)) {
                localName = prop.value.left.name;
              }
              extractEdge(
                path,
                createImportEdge({
                  import: {
                    path: source,
                    name: importedName,
                  },
                  local: localName,
                })
              );
            }
          });
        });
      },
      // Handles CommonJS exports like:
      // module.exports = foo
      // exports.bar = baz
      // module.exports.qux = value
      CommonJSExport(path) {
        const node = path.node;
        const left = node.left;

        const rightIdentifierItemName = t.isIdentifier(node.right) ? node.right.name : null;

        if (t.isIdentifier(left.object)) {
          if (left.object.name === 'exports' && t.isIdentifier(left.property)) {
            // Pattern: exports.foo = bar;
            // Example: exports.myFunction = function() {};
            extractEdge(
              path,
              createExportEdge({
                export: {
                  name: left.property.name,
                },
                local: rightIdentifierItemName,
              })
            );
          } else if (
            left.object.name === 'module' &&
            t.isIdentifier(left.property) &&
            left.property.name === 'exports'
          ) {
            // Pattern: module.exports = something;
            // Example: module.exports = { foo: 'bar' };
            extractEdge(
              path,
              createExportEdge({
                export: {
                  name: 'default',
                },
                local: rightIdentifierItemName,
              })
            );
          }
        } else if (
          t.isMemberExpression(left.object) &&
          t.isIdentifier(left.object.object) &&
          left.object.object.name === 'module' &&
          t.isIdentifier(left.object.property) &&
          left.object.property.name === 'exports' &&
          t.isIdentifier(left.property)
        ) {
          // Pattern: module.exports.foo = bar;
          // Example: module.exports.myFunction = function() {};
          extractEdge(
            path,
            createExportEdge({
              export: {
                name: left.property.name,
              },
              local: rightIdentifierItemName,
            })
          );
        }
      },

      // Handles ES6 import declarations like: import foo from 'bar', import { baz, qux } from 'module', import * as ns from 'module'
      ImportDeclaration(path) {
        const node = path.node;
        const source = node.source.value;

        if (node.specifiers.length === 0) {
          // import 'module' - side effect import
          extractEdge(
            path,
            createImportEdge({
              import: {
                path: source,
                name: null,
              },
              local: null,
            })
          );
        } else {
          node.specifiers.forEach((specifier) => {
            if (t.isImportDefaultSpecifier(specifier)) {
              // import foo from 'bar'
              extractEdge(
                path,
                createImportEdge({
                  import: {
                    path: source,
                    name: 'default',
                  },
                  local: specifier.local.name,
                })
              );
            } else if (t.isImportSpecifier(specifier)) {
              // import { foo, bar as baz } from 'module'
              const importedName = t.isIdentifier(specifier.imported)
                ? specifier.imported.name
                : specifier.imported.value;
              extractEdge(
                path,
                createImportEdge({
                  import: {
                    path: source,
                    name: importedName,
                  },
                  local: specifier.local.name,
                })
              );
            } else if (t.isImportNamespaceSpecifier(specifier)) {
              // import * as ns from 'module'
              extractEdge(
                path,
                createImportEdge({
                  import: {
                    path: source,
                    name: '*',
                  },
                  local: specifier.local.name,
                })
              );
            }
          });
        }
      },
      // Handles named exports like: export { foo, bar as baz }, export const foo = ..., export function bar() {}
      ExportNamedDeclaration(path) {
        const node = path.node;

        function extractFromSpecifier(
          specifier: t.ExportDefaultSpecifier | t.ExportNamespaceSpecifier | t.ExportSpecifier
        ) {
          let imp: Import | undefined;

          if (node.source) {
            imp = {
              path: node.source.value,
              name: t.isExportDefaultSpecifier(specifier)
                ? 'default'
                : t.isExportNamespaceSpecifier(specifier)
                ? '*'
                : specifier.local.name,
            };
          }

          const exp: Export = {
            name: t.isStringLiteral(specifier.exported)
              ? specifier.exported.value
              : specifier.exported.name,
          };

          extractEdge(
            path,
            createExportEdge({
              import: imp,
              export: exp,
              local: !node.source && t.isExportSpecifier(specifier) ? specifier.local.name : null,
            })
          );
        }

        if (node.specifiers.length) {
          node.specifiers.forEach((specifier) => {
            extractFromSpecifier(specifier);
          });
          return;
        }

        if (!node.declaration) {
          return;
        }

        // export const foo = ..., export function bar() {}, export class Baz {}
        if (t.isVariableDeclaration(node.declaration)) {
          node.declaration.declarations.forEach((declarator) => {
            if (t.isIdentifier(declarator.id)) {
              extractEdge(
                path,
                createExportEdge({
                  export: {
                    name: declarator.id.name,
                  },
                  local: declarator.id.name,
                })
              );
            }
          });
        } else if (
          (t.isFunctionDeclaration(node.declaration) || t.isClassDeclaration(node.declaration)) &&
          node.declaration.id
        ) {
          extractEdge(
            path,
            createExportEdge({
              export: {
                name: node.declaration.id.name,
              },
              local: node.declaration.id.name,
            })
          );
        }
      },

      // Handles export all declarations like: export * from 'module'
      ExportAllDeclaration(path) {
        const node = path.node;
        const source = node.source.value;

        // export * from 'module'
        extractEdge(
          path,
          createExportEdge({
            import: {
              path: source,
              name: '*',
            },
            export: {
              name: '*',
            },
            local: null,
          })
        );
      },

      // Handles default exports like: export default foo, export default function() {}, export default class {}
      ExportDefaultDeclaration(path) {
        const node = path.node;
        let localName: ItemName = null;

        // Try to get a more specific local name if available
        if (t.isIdentifier(node.declaration)) {
          localName = node.declaration.name;
        } else if (
          (t.isFunctionDeclaration(node.declaration) || t.isClassDeclaration(node.declaration)) &&
          node.declaration.id
        ) {
          localName = node.declaration.id.name;
        }

        extractEdge(
          path,
          createExportEdge({
            export: {
              name: 'default',
            },
            local: localName,
          })
        );
      },
      Jest(path) {
        const importSource = path.node.arguments[0].value;
        const hasCallback = path.node.arguments.length > 1;

        extractEdge(
          path,
          createImportEdge({
            import: {
              name: hasCallback ? '*' : null,
              path: importSource,
            },
            local: null,
          })
        );
      },
    })
  );

  return edges;
}

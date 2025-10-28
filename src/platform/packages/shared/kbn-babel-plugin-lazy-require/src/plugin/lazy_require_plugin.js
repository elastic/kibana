/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Babel plugin that transforms top-level require() and import statements into lazy-loaded getters.
 * See README.md for detailed examples and documentation.
 */

const { shouldSkipIdentifier, detectModuleLevelUsage } = require('./helpers');

module.exports = function lazyRequirePlugin({ types: t }) {
  /**
   * Check if an expression is a direct require() call with a string literal
   */
  function isSimpleRequireCall(node) {
    return (
      t.isCallExpression(node) &&
      t.isIdentifier(node.callee, { name: 'require' }) &&
      node.arguments.length === 1 &&
      t.isStringLiteral(node.arguments[0])
    );
  }

  return {
    name: 'kbn-lazy-require',
    visitor: {
      Program(programPath) {
        // State tracking
        const modules = new Map(); // requirePath -> { cacheId, requirePath, outerFunc? }
        const properties = new Map(); // varName -> { moduleRequirePath, propertyKey, isConst, needsInterop? }
        const declarationsToRemove = new Map(); // varName -> { type, path, index? }
        const importsVar = programPath.scope.generateUidIdentifier('imports');

        // =================================================================
        // PHASE 0: Collect direct re-exports (export { x } from './module')
        // =================================================================
        const directReExportSources = new Set();
        programPath.traverse({
          ExportNamedDeclaration(exportPath) {
            if (exportPath.node.source && t.isStringLiteral(exportPath.node.source)) {
              directReExportSources.add(exportPath.node.source.value);
            }
          },
        });

        // =================================================================
        // PHASE 1: Collect require() and import statements
        // =================================================================
        programPath.traverse({
          VariableDeclaration(path) {
            if (path.parent !== programPath.node) {
              return;
            }

            const declarations = path.node.declarations;
            const declIndicesToRemove = [];

            for (let i = 0; i < declarations.length; i++) {
              const decl = declarations[i];

              let requirePath = null;
              let outerFunc = null;

              if (isSimpleRequireCall(decl.init)) {
                requirePath = decl.init.arguments[0].value;
              } else if (
                t.isCallExpression(decl.init) &&
                decl.init.arguments.length === 1 &&
                isSimpleRequireCall(decl.init.arguments[0])
              ) {
                requirePath = decl.init.arguments[0].arguments[0].value;
                outerFunc = decl.init.callee;
              }

              // Skip if we didn't find a require pattern
              if (!requirePath) {
                continue;
              }

              const isConst = path.node.kind === 'const';

              // Ensure module cache exists for this require path
              if (!modules.has(requirePath)) {
                modules.set(requirePath, {
                  cacheId: programPath.scope.generateUidIdentifier(`module`),
                  requirePath,
                  outerFunc,
                });
              }

              if (t.isIdentifier(decl.id)) {
                // Simple assignment: const foo = require('./foo')
                const varName = decl.id.name;
                properties.set(varName, {
                  moduleRequirePath: requirePath,
                  propertyKey: null,
                  isConst,
                });
                declIndicesToRemove.push(i);
                declarationsToRemove.set(varName, { type: 'require', path, index: i });
              } else if (t.isObjectPattern(decl.id)) {
                // Destructuring: const { a, b } = require('./foo')
                // Only transform simple patterns (no nesting, rest, computed properties)
                let canTransform = true;
                for (const prop of decl.id.properties) {
                  if (
                    !t.isObjectProperty(prop) ||
                    !t.isIdentifier(prop.key) ||
                    !t.isIdentifier(prop.value) ||
                    prop.computed
                  ) {
                    canTransform = false;
                    break;
                  }
                }

                if (canTransform) {
                  // All destructured properties share the same declaration
                  let isFirstProperty = true;
                  for (const prop of decl.id.properties) {
                    const varName = prop.value.name;
                    const propKey = prop.key.name;

                    properties.set(varName, {
                      moduleRequirePath: requirePath,
                      propertyKey: propKey,
                      isConst,
                    });

                    // Only the first property needs to track the declaration for removal
                    if (isFirstProperty) {
                      declarationsToRemove.set(varName, { type: 'require', path, index: i });
                      isFirstProperty = false;
                    }
                  }
                  declIndicesToRemove.push(i);
                }
              }
            }
          },

          ImportDeclaration(path) {
            if (path.parent !== programPath.node) {
              return;
            }

            const importPath = path.node.source.value;

            // Skip imports from directly re-exported modules
            if (directReExportSources.has(importPath)) {
              return;
            }

            const isConst = true;

            // Ensure module cache exists for this import path
            if (!modules.has(importPath)) {
              modules.set(importPath, {
                cacheId: programPath.scope.generateUidIdentifier(`module`),
                requirePath: importPath,
                outerFunc: null, // We'll handle interop manually for imports
              });
            }

            // Skip if any import is re-exported (import then export pattern)
            const hasReExport = path.node.specifiers.some((specifier) => {
              const binding = path.scope.getBinding(specifier.local.name);
              return binding?.referencePaths.some(
                (refPath) =>
                  refPath.isReferencedIdentifier() &&
                  (t.isExportSpecifier(refPath.parent) ||
                    t.isExportDefaultDeclaration(refPath.parent) ||
                    t.isExportNamedDeclaration(refPath.parent))
              );
            });

            if (hasReExport) {
              return;
            }

            // Handle different import types
            for (const specifier of path.node.specifiers) {
              const varName = specifier.local.name;
              let propertyKey = null;
              let needsInterop = false;

              if (t.isImportDefaultSpecifier(specifier)) {
                // import foo from './bar'
                propertyKey = 'default';
                needsInterop = true;
              } else if (t.isImportNamespaceSpecifier(specifier)) {
                // import * as foo from './bar'
                propertyKey = null; // entire module
              } else if (t.isImportSpecifier(specifier)) {
                // import { foo } from './bar' or import { foo as bar } from './bar'
                propertyKey = specifier.imported.name;
              }

              properties.set(varName, {
                moduleRequirePath: importPath,
                propertyKey,
                isConst,
                needsInterop,
              });
              declarationsToRemove.set(varName, { type: 'import', path });
            }
          },
        });

        if (properties.size === 0) {
          return;
        }

        // =================================================================
        // PHASE 1.5: Detect and exclude module-level usage
        // =================================================================
        const importsUsedInModuleLevelCode = detectModuleLevelUsage(
          programPath,
          properties,
          isSimpleRequireCall,
          t
        );

        // Exclude from transformation (will remain as regular imports/requires)
        for (const varName of importsUsedInModuleLevelCode) {
          properties.delete(varName);
          declarationsToRemove.delete(varName);
        }

        // Remove orphaned modules (no properties left)
        const activeModules = new Set(
          Array.from(properties.values()).map((info) => info.moduleRequirePath)
        );
        for (const [modulePath] of modules) {
          if (!activeModules.has(modulePath)) {
            modules.delete(modulePath);
          }
        }

        // If all imports are used in module-level code, nothing to transform
        if (properties.size === 0) {
          return;
        }

        // Remove declarations that we're transforming
        const requirePathsToProcess = new Set();
        const importPathsToRemove = new Set();

        for (const [varName, declInfo] of declarationsToRemove) {
          // Only process if this property is still being transformed
          if (properties.has(varName)) {
            if (declInfo.type === 'import') {
              importPathsToRemove.add(declInfo.path);
            } else if (declInfo.type === 'require') {
              requirePathsToProcess.add(declInfo.path);
            }
          }
        }

        // Handle import removals (can be partial)
        for (const importPath of importPathsToRemove) {
          // Check if ALL specifiers from this import are being transformed
          const specifiers = importPath.node.specifiers;
          const allTransformed = specifiers.every((spec) => {
            const localName = spec.local.name;
            return properties.has(localName);
          });

          if (allTransformed) {
            // Remove the entire import
            importPath.remove();
          } else {
            // Partial removal - only remove the specifiers we're transforming
            const remainingSpecifiers = specifiers.filter((spec) => {
              return !properties.has(spec.local.name);
            });
            importPath.node.specifiers = remainingSpecifiers;
          }
        }

        // Handle require removals
        for (const requirePath of requirePathsToProcess) {
          const declarations = requirePath.node.declarations;
          const indicesToRemove = [];

          for (let i = 0; i < declarations.length; i++) {
            const decl = declarations[i];
            // Check if this declaration should be removed
            let shouldRemove = false;

            if (t.isIdentifier(decl.id) && properties.has(decl.id.name)) {
              shouldRemove = true;
            } else if (t.isObjectPattern(decl.id)) {
              // Check if any property is being transformed
              const allPropsTransformed = decl.id.properties.every((prop) => {
                return (
                  t.isObjectProperty(prop) &&
                  t.isIdentifier(prop.value) &&
                  properties.has(prop.value.name)
                );
              });
              if (allPropsTransformed) {
                shouldRemove = true;
              }
            }

            if (shouldRemove) {
              indicesToRemove.push(i);
            }
          }

          // Remove in reverse order to maintain indices
          for (let i = indicesToRemove.length - 1; i >= 0; i--) {
            declarations.splice(indicesToRemove[i], 1);
          }

          // If all declarations removed, remove the entire statement
          if (declarations.length === 0) {
            requirePath.remove();
          }
        }

        // =================================================================
        // PHASE 2: Replace identifier usages
        // =================================================================
        programPath.traverse({
          Identifier(path) {
            if (shouldSkipIdentifier(path, properties, programPath, t)) {
              return;
            }

            // Replace: foo → _imports.foo
            const varName = path.node.name;
            path.replaceWith(t.memberExpression(importsVar, t.identifier(varName)));
          },
        });

        // =================================================================
        // PHASE 3: Generate module caches
        // =================================================================
        const moduleCacheDeclarations = [];

        for (const [, moduleInfo] of modules) {
          moduleCacheDeclarations.push(
            t.variableDeclaration('const', [
              t.variableDeclarator(
                moduleInfo.cacheId,
                t.objectExpression([
                  t.objectProperty(t.identifier('initialized'), t.booleanLiteral(false)),
                  t.objectProperty(t.identifier('value'), t.identifier('undefined')),
                ])
              ),
            ])
          );
        }

        // =================================================================
        // PHASE 4: Generate _imports object
        // =================================================================

        // Check if we need _interopRequireDefault helper
        let needsInteropHelper = false;
        for (const [, propInfo] of properties) {
          if (propInfo.needsInterop) {
            needsInteropHelper = true;
            break;
          }
        }

        const importProperties = [];

        for (const [varName, propInfo] of properties) {
          const moduleInfo = modules.get(propInfo.moduleRequirePath);
          const cacheId = moduleInfo.cacheId;
          const cacheInitialized = t.memberExpression(cacheId, t.identifier('initialized'));
          const cacheValue = t.memberExpression(cacheId, t.identifier('value'));

          // Build require expression (always store raw module in cache)
          let requireExpression = t.callExpression(t.identifier('require'), [
            t.stringLiteral(propInfo.moduleRequirePath),
          ]);
          if (moduleInfo.outerFunc) {
            requireExpression = t.callExpression(moduleInfo.outerFunc, [requireExpression]);
          }

          // Helper: creates the initialization block (if (!initialized) { load module })
          const createInitBlock = () =>
            t.ifStatement(
              t.unaryExpression('!', cacheInitialized),
              t.blockStatement([
                t.expressionStatement(t.assignmentExpression('=', cacheValue, requireExpression)),
                t.expressionStatement(
                  t.assignmentExpression('=', cacheInitialized, t.booleanLiteral(true))
                ),
              ])
            );

          // Determine return value for getter
          let returnExpression;
          if (propInfo.needsInterop) {
            // Default import: apply interop wrapper
            returnExpression = t.memberExpression(
              t.callExpression(t.identifier('_interopRequireDefault'), [cacheValue]),
              t.identifier('default')
            );
          } else if (propInfo.propertyKey === null) {
            // Namespace import: return entire module
            returnExpression = cacheValue;
          } else {
            // Named import: return specific property
            returnExpression = t.memberExpression(cacheValue, t.identifier(propInfo.propertyKey));
          }

          // Create getter
          importProperties.push(
            t.objectMethod(
              'get',
              t.identifier(varName),
              [],
              t.blockStatement([createInitBlock(), t.returnStatement(returnExpression)])
            )
          );

          // Create setter for let/var (loads module for side effects before replacing)
          if (!propInfo.isConst) {
            importProperties.push(
              t.objectMethod(
                'set',
                t.identifier(varName),
                [t.identifier('newValue')],
                t.blockStatement([
                  createInitBlock(),
                  t.expressionStatement(
                    t.assignmentExpression('=', cacheValue, t.identifier('newValue'))
                  ),
                ])
              )
            );
          }
        }

        // =================================================================
        // PHASE 5: Insert generated code
        // =================================================================

        // Insert _imports object
        programPath.unshiftContainer(
          'body',
          t.variableDeclaration('const', [
            t.variableDeclarator(importsVar, t.objectExpression(importProperties)),
          ])
        );

        // Insert _interopRequireDefault helper if needed for default imports
        if (needsInteropHelper) {
          programPath.unshiftContainer(
            'body',
            t.variableDeclaration('const', [
              t.variableDeclarator(
                t.identifier('_interopRequireDefault'),
                t.callExpression(t.identifier('require'), [
                  t.stringLiteral('@babel/runtime/helpers/interopRequireDefault'),
                ])
              ),
            ])
          );
        }

        // Insert module cache variables (in reverse to maintain order)
        for (let i = moduleCacheDeclarations.length - 1; i >= 0; i--) {
          programPath.unshiftContainer('body', moduleCacheDeclarations[i]);
        }
      },
    },
  };
};

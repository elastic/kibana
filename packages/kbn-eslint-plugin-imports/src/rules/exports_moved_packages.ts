/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Rule, AST } from 'eslint';
import * as T from '@babel/types';
import { TSESTree } from '@typescript-eslint/typescript-estree';

import { visitAllImportStatements, Importer } from '../helpers/visit_all_import_statements';

export interface MovedExportsRule {
  fromPackage: string;
  toPackage: string;
  exportNames: string[];
}

interface Imported {
  type: 'require' | 'import expression' | 'export' | 'export type' | 'import' | 'import type';
  node:
    | TSESTree.ImportSpecifier
    | T.ImportSpecifier
    | TSESTree.Property
    | T.Property
    | TSESTree.ExportSpecifier
    | T.ExportSpecifier;
  name: string;
  id?: string;
}

interface BadImport extends Imported {
  id: string;
  newPkg: string;
}

function getParent(node: T.Node | TSESTree.Node): T.Node | TSESTree.Node | undefined {
  if ('parent' in node) {
    return node.parent as any;
  }
}

function findDeclaration(node: T.Node | TSESTree.Node) {
  let cursor: T.Node | TSESTree.Node | undefined = node;
  while (
    cursor &&
    !T.isVariableDeclaration(cursor) &&
    cursor.type !== TSESTree.AST_NODE_TYPES.VariableDeclaration
  ) {
    cursor = getParent(cursor);
  }
  return cursor;
}

function getBadImports(imported: Imported[], rules: MovedExportsRule[]): BadImport[] {
  return imported.flatMap((i): BadImport | never[] => {
    if (!i.id) {
      return [];
    }

    const name = i.name;
    const match = rules.find((r) => r.exportNames.includes(name));
    if (!match) {
      return [];
    }

    return {
      type: i.type,
      node: i.node,
      id: i.id,
      name: i.name,
      newPkg: match.toPackage,
    };
  });
}

function inspectImports(
  importer: Importer,
  rules: MovedExportsRule[]
): undefined | { importCount: number; allBadImports: BadImport[] } {
  // get import names from require() and await import() calls
  if (
    T.isCallExpression(importer) ||
    importer.type === TSESTree.AST_NODE_TYPES.CallExpression ||
    importer.type === TSESTree.AST_NODE_TYPES.ImportExpression
  ) {
    const declaration = findDeclaration(importer);
    if (!declaration || !declaration.declarations[0]) {
      return;
    }
    const declarator = declaration.declarations[0];
    if (
      !T.isObjectPattern(declarator.id) &&
      declarator.id.type !== TSESTree.AST_NODE_TYPES.ObjectPattern
    ) {
      return;
    }

    const properties = declarator.id.properties;
    return {
      importCount: properties.length,
      allBadImports: getBadImports(
        properties.flatMap((prop): Imported | never[] => {
          if (
            prop.type !== TSESTree.AST_NODE_TYPES.Property ||
            prop.kind !== 'init' ||
            prop.key.type !== TSESTree.AST_NODE_TYPES.Identifier
          ) {
            return [];
          }

          const name = prop.key.name;
          const local =
            prop.value.type === TSESTree.AST_NODE_TYPES.Identifier ? prop.value.name : undefined;

          return {
            node: prop,
            name,
            type:
              importer.type === TSESTree.AST_NODE_TYPES.ImportExpression ||
              T.isImport(importer.callee)
                ? 'import expression'
                : 'require',
            id: !local ? undefined : name === local ? name : `${name}: ${local}`,
          };
        }),
        rules
      ),
    };
  }

  // get import names from import {} and export {} from
  if (
    T.isImportDeclaration(importer) ||
    importer.type === TSESTree.AST_NODE_TYPES.ImportDeclaration ||
    T.isExportNamedDeclaration(importer) ||
    importer.type === TSESTree.AST_NODE_TYPES.ExportNamedDeclaration
  ) {
    const type =
      T.isExportNamedDeclaration(importer) ||
      importer.type === TSESTree.AST_NODE_TYPES.ExportNamedDeclaration
        ? importer.exportKind === 'type'
          ? 'export type'
          : 'export'
        : (T.isImportDeclaration(importer) ||
            importer.type === TSESTree.AST_NODE_TYPES.ImportDeclaration) &&
          importer.importKind === 'type'
        ? 'import type'
        : 'import';

    return {
      importCount: importer.specifiers.length,
      allBadImports: getBadImports(
        importer.specifiers.flatMap((specifier): Imported | never[] => {
          if (
            T.isImportSpecifier(specifier) ||
            specifier.type === TSESTree.AST_NODE_TYPES.ImportSpecifier
          ) {
            const name = T.isStringLiteral(specifier.imported)
              ? specifier.imported.value
              : specifier.imported.name;
            const local = specifier.local.name;
            return {
              node: specifier,
              name,
              type,
              id: name === local ? name : `${name} as ${local}`,
            };
          }

          if (
            T.isExportSpecifier(specifier) ||
            specifier.type === TSESTree.AST_NODE_TYPES.ExportSpecifier
          ) {
            const name = T.isStringLiteral(specifier.exported)
              ? specifier.exported.value
              : specifier.exported.name;
            const local = specifier.local.name;
            return {
              node: specifier,
              name: local,
              type,
              id: name === local ? name : `${local} as ${name}`,
            };
          }

          return [];
        }),
        rules
      ),
    };
  }
}

export const ExportsMovedPackagesRule: Rule.RuleModule = {
  meta: {
    fixable: 'code',
    schema: [
      {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            fromPackage: {
              type: 'string',
            },
            toPackage: {
              type: 'string',
            },
            exportNames: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
          },
        },
      },
    ],
  },

  create(context) {
    const rules: MovedExportsRule[] = context.options[0];
    const source = context.getSourceCode();

    // get the range for the entire "import", expanding require()/import() to their
    // entire variable declaration and including the trailing newline if we can
    // idenitify it
    function getRangeWithNewline(
      importer: Importer | T.VariableDeclaration | TSESTree.VariableDeclaration
    ): AST.Range {
      if (
        T.isCallExpression(importer) ||
        importer.type === TSESTree.AST_NODE_TYPES.CallExpression ||
        importer.type === TSESTree.AST_NODE_TYPES.ImportExpression
      ) {
        const declaration = findDeclaration(importer);
        if (declaration) {
          return getRangeWithNewline(declaration);
        }
      }

      const text = source.getText(importer as any, 0, 1);
      const range = getRange(importer);
      return text.endsWith('\n') ? [range[0], range[1] + 1] : range;
    }

    function getRange(
      nodeA: T.Node | TSESTree.Node | AST.Token,
      nodeB: T.Node | TSESTree.Node | AST.Token = nodeA
    ): AST.Range {
      if (!nodeA.loc) {
        throw new Error('unable to use babel AST nodes without locations');
      }
      if (!nodeB.loc) {
        throw new Error('unable to use babel AST nodes without locations');
      }
      return [source.getIndexFromLoc(nodeA.loc.start), source.getIndexFromLoc(nodeB.loc.end)];
    }

    return visitAllImportStatements((req, { importer }) => {
      if (!req) {
        return;
      }

      const rulesForRightPackage = rules.filter((m) => m.fromPackage === req);
      if (!rulesForRightPackage.length) {
        return;
      }

      const { allBadImports, importCount } = inspectImports(importer, rulesForRightPackage) ?? {};
      if (!allBadImports?.length) {
        return;
      }

      const badImportsByNewPkg = new Map<string, typeof allBadImports>();
      const groupedBadImports = new Map<BadImport['type'], Map<string, typeof allBadImports>>();
      for (const badProp of allBadImports) {
        if (!groupedBadImports.has(badProp.type)) {
          groupedBadImports.set(badProp.type, new Map());
        }
        const typeGroup = groupedBadImports.get(badProp.type)!;
        if (!typeGroup.has(badProp.newPkg)) {
          typeGroup.set(badProp.newPkg, []);
        }

        typeGroup.get(badProp.newPkg)!.push(badProp);

        const existing = badImportsByNewPkg.get(badProp.newPkg);
        if (existing) {
          existing.push(badProp);
        } else {
          badImportsByNewPkg.set(badProp.newPkg, [badProp]);
        }
      }

      context.report({
        node: importer as any,
        message: Array.from(badImportsByNewPkg)
          .map(
            ([pkg, bad]) =>
              `Export${bad.length === 1 ? '' : 's'} ${bad.map((b) => `"${b.name}"`).join(', ')} ${
                bad.length === 1 ? 'is' : 'are'
              } now in package "${pkg}"`
          )
          .join('\n'),
        *fix(fixer) {
          const importerRange = getRangeWithNewline(importer);

          // insert new require() calls
          for (const [type, badProps] of groupedBadImports) {
            for (const [pkg, props] of badProps) {
              switch (type) {
                case 'require':
                  yield fixer.insertTextAfterRange(
                    importerRange,
                    `const { ${props.map((b) => b.id).join(', ')} } = require('${pkg}');\n`
                  );
                  break;
                case 'import expression':
                  yield fixer.insertTextAfterRange(
                    importerRange,
                    `const { ${props.map((b) => b.id).join(', ')} } = await import('${pkg}');\n`
                  );
                  break;
                case 'export':
                  yield fixer.insertTextAfterRange(
                    importerRange,
                    `export { ${props.map((b) => b.id).join(', ')} } from '${pkg}';\n`
                  );
                  break;
                case 'export type':
                  yield fixer.insertTextAfterRange(
                    importerRange,
                    `export type { ${props.map((b) => b.id).join(', ')} } from '${pkg}';\n`
                  );
                  break;
                case 'import':
                  yield fixer.insertTextAfterRange(
                    importerRange,
                    `import { ${props.map((b) => b.id).join(', ')} } from '${pkg}';\n`
                  );
                  break;
                case 'import type':
                  yield fixer.insertTextAfterRange(
                    importerRange,
                    `import type { ${props.map((b) => b.id).join(', ')} } from '${pkg}';\n`
                  );
                  break;
              }
            }
          }

          if (importCount === allBadImports.length) {
            yield fixer.removeRange(importerRange);
          } else {
            for (const bp of allBadImports) {
              const nextToken = source.getTokenAfter(bp.node as any);
              if (nextToken?.value === ',') {
                yield fixer.removeRange(getRange(bp.node, nextToken));
              } else {
                yield fixer.removeRange(getRange(bp.node));
              }
            }
          }
        },
      });
    });
  },
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CreateOnceRule, ESTree, Range, SourceCode, Token } from '@oxlint/plugins';

import type { Importer, SomeNode } from '../helpers/ast';
import {
  isCallExpression,
  isExportNamedDeclaration,
  isExportSpecifier,
  isImportDeclaration,
  isImportSpecifier,
  isObjectPattern,
  isStringLiteral,
  isVariableDeclaration,
} from '../helpers/ast';
import { visitAllImportStatements } from '../helpers/visit_all_import_statements';

export interface MovedExportsRule {
  from: string;
  to: string;
  exportNames: string[];
}

interface Imported {
  type: 'require' | 'import expression' | 'export' | 'export type' | 'import' | 'import type';
  node: ESTree.ImportSpecifier | ESTree.BindingProperty | ESTree.ExportSpecifier;
  name: string;
  id?: string;
}

interface BadImport extends Imported {
  id: string;
  newPkg: string;
}

function findDeclaration(node: SomeNode) {
  let cursor: SomeNode | null = node;
  while (cursor && !isVariableDeclaration(cursor)) {
    cursor = cursor.parent;
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
      newPkg: match.to,
    };
  });
}

function inspectImports(
  importer: Importer,
  rules: MovedExportsRule[]
): undefined | { importCount: number; allBadImports: BadImport[] } {
  // get import names from require() and await import() calls
  if (isCallExpression(importer) || importer.type === 'ImportExpression') {
    const declaration = findDeclaration(importer);
    if (!declaration || !declaration.declarations[0]) {
      return;
    }
    const declarator = declaration.declarations[0];
    if (!isObjectPattern(declarator.id)) {
      return;
    }

    const properties = declarator.id.properties;
    return {
      importCount: properties.length,
      allBadImports: getBadImports(
        properties.flatMap((prop): Imported | never[] => {
          if (prop.type !== 'Property' || prop.kind !== 'init' || prop.key.type !== 'Identifier') {
            return [];
          }

          const name = prop.key.name;
          const local = prop.value.type === 'Identifier' ? prop.value.name : undefined;

          return {
            node: prop,
            name,
            type: importer.type === 'ImportExpression' ? 'import expression' : 'require',
            id: !local ? undefined : name === local ? name : `${name}: ${local}`,
          };
        }),
        rules
      ),
    };
  }

  // get import names from import {} and export {} from
  if (isImportDeclaration(importer) || isExportNamedDeclaration(importer)) {
    const type = isExportNamedDeclaration(importer)
      ? importer.exportKind === 'type'
        ? 'export type'
        : 'export'
      : importer.importKind === 'type'
      ? 'import type'
      : 'import';

    const specifiers: SomeNode[] = importer.specifiers;
    return {
      importCount: specifiers.length,
      allBadImports: getBadImports(
        specifiers.flatMap((specifier): Imported | never[] => {
          if (isImportSpecifier(specifier)) {
            const name = isStringLiteral(specifier.imported)
              ? specifier.imported.value
              : specifier.imported?.type === 'Identifier'
              ? specifier.imported.name
              : 'name';
            const local = specifier.local.name;
            return {
              node: specifier,
              name,
              type,
              id: name === local ? name : `${name} as ${local}`,
            };
          }

          if (isExportSpecifier(specifier)) {
            const name = isStringLiteral(specifier.exported)
              ? specifier.exported.value
              : specifier.exported?.type === 'Identifier'
              ? specifier.exported.name
              : 'name';
            const local = specifier.local.type === 'Identifier' ? specifier.local.name : '';
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

export const ExportsMovedPackagesRule: CreateOnceRule = {
  meta: {
    fixable: 'code',
    schema: [
      {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
            },
            to: {
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
    docs: {
      url: 'https://github.com/elastic/kibana/blob/main/packages/kbn-eslint-plugin-imports/README.mdx#kbnimportsexports_moved_packages',
    },
  },

  createOnce(context) {
    let rules: MovedExportsRule[];
    let source: SourceCode;

    // get the range for the entire "import", expanding require()/import() to their
    // entire variable declaration and including the trailing newline if we can
    // idenitify it
    function getRangeWithNewline(importer: Importer | ESTree.VariableDeclaration): Range {
      if (isCallExpression(importer) || importer.type === 'ImportExpression') {
        const declaration = findDeclaration(importer);
        if (declaration) {
          return getRangeWithNewline(declaration);
        }
      }

      const text = source.getText(importer, 0, 1);
      const range = getRange(importer);
      return text.endsWith('\n') ? [range[0], range[1] + 1] : range;
    }

    function getRange(nodeA: SomeNode | Token, nodeB: SomeNode | Token = nodeA): Range {
      return [source.getIndexFromLoc(nodeA.loc.start), source.getIndexFromLoc(nodeB.loc.end)];
    }

    return {
      before() {
        // `meta.schema` validates the options, which Oxlint only types as JSON values
        [rules] = context.options as unknown as ReadonlyArray<MovedExportsRule[]>;
        source = context.sourceCode;
      },
      ...visitAllImportStatements((req, { importer }) => {
        if (!req) {
          return;
        }

        const rulesForRightPackage = rules.filter((m) => m.from === req);
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
          node: importer,
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
                const nextToken = source.getTokenAfter(bp.node);
                if (nextToken?.value === ',') {
                  yield fixer.removeRange(getRange(bp.node, nextToken));
                } else {
                  yield fixer.removeRange(getRange(bp.node));
                }
              }
            }
          },
        });
      }),
    };
  },
};

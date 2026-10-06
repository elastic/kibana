/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  Comment,
  CreateOnceRule,
  Definition,
  ESTree,
  Fix,
  Fixer,
  Location,
  Range,
  Scope,
  SourceCode,
  Variable,
} from '@oxlint/plugins';

import type { SomeNode } from '../helpers/ast';
import { isImportDeclaration } from '../helpers/ast';
import { RUNNING_IN_EDITOR } from '../helpers/running_in_editor';

/** Matches the JSX pragma comment that `react/jsx-uses-react` reads: an `@jsx` tag and a name */
const JSX_PRAGMA_COMMENT = /@jsx\s+([^\s]+)/;

function findImportParent(def: Definition): ESTree.ImportDeclaration | undefined {
  let cursor: SomeNode | null = def.node;
  while (cursor) {
    if (isImportDeclaration(cursor)) {
      return cursor;
    }
    cursor = cursor.parent;
  }
  return;
}

function isEslintUsed(variable: Variable & { eslintUsed?: boolean }) {
  return !!variable.eslintUsed;
}

function findUnusedImportDefs(globalScope: Scope) {
  if (globalScope.type !== 'global') {
    throw new Error('pass the global scope');
  }

  const unused = [];

  for (const scope of globalScope.childScopes) {
    if (scope.type !== 'module') {
      continue;
    }

    for (const variable of scope.variables) {
      if (variable.references.length > 0 || isEslintUsed(variable)) {
        continue;
      }

      for (const def of variable.defs) {
        const importParent = findImportParent(def);
        if (importParent) {
          unused.push({
            def,
            importParent,
          });
        }
      }
    }
  }

  return unused;
}

function isTsOrEslintIgnore(comment: Comment) {
  const value = comment.value.trim();
  return (
    value.startsWith('@ts-ignore') ||
    value.startsWith('@ts-expect-error') ||
    value.startsWith('eslint-disable')
  );
}

export const NoUnusedImportsRule: CreateOnceRule = {
  meta: {
    hasSuggestions: true,
    fixable: 'code',
    docs: {
      url: 'https://github.com/elastic/kibana/blob/main/packages/kbn-eslint-plugin-imports/README.mdx#kbnimportsno_unused_imports',
    },
  },
  createOnce(context) {
    let source: SourceCode;
    let jsxPragma: string | undefined;
    let hasImportSpecifiers: boolean;

    function getRange(nodeA: { loc: Location }, nodeB: { loc: Location } | number = nodeA): Range {
      const nodeBLoc = typeof nodeB === 'number' ? nodeB : nodeB.loc;
      return [
        source.getIndexFromLoc(nodeA.loc.start),
        typeof nodeBLoc === 'number'
          ? source.getIndexFromLoc(nodeA.loc.end) + nodeBLoc
          : source.getIndexFromLoc(nodeBLoc.end),
      ];
    }

    function report(node: SomeNode, msg: string, fix: (fixer: Fixer) => IterableIterator<Fix>) {
      context.report({
        node,
        message: msg,
        ...(RUNNING_IN_EDITOR
          ? {
              suggest: [
                {
                  desc: 'Remove',
                  fix,
                },
              ],
            }
          : {
              fix,
            }),
      });
    }

    /**
     * In ESLint, `react/jsx-uses-react` marks the JSX pragma (`React` unless a `@jsx` comment names
     * another one) and `Fragment` as used. That rule doesn't run alongside this one in Oxlint.
     */
    function markJsxPragmaAsUsed(node: SomeNode) {
      jsxPragma ??=
        source
          .getAllComments()
          .find(({ value }) => JSX_PRAGMA_COMMENT.test(value))
          ?.value.match(JSX_PRAGMA_COMMENT)?.[1]
          .split('.')[0] ?? 'React';
      source.markVariableAsUsed(jsxPragma, node);
    }

    return {
      before() {
        source = context.sourceCode;
        jsxPragma = undefined;
        hasImportSpecifiers = false;
      },
      ImportDeclaration(node) {
        hasImportSpecifiers ||= node.specifiers.length > 0;
      },
      JSXOpeningElement: markJsxPragmaAsUsed,
      JSXOpeningFragment: markJsxPragmaAsUsed,
      JSXFragment(node) {
        source.markVariableAsUsed('Fragment', node);
      },
      'Program:exit': (node) => {
        // only import specifiers can be unused imports, so skip the costly scope analysis without them
        if (!hasImportSpecifiers) {
          return;
        }

        const unusedByImport = new Map<ESTree.ImportDeclaration, Definition[]>();
        for (const { importParent, def } of findUnusedImportDefs(source.getScope(node))) {
          const group = unusedByImport.get(importParent);
          if (group) {
            group.push(def);
          } else {
            unusedByImport.set(importParent, [def]);
          }
        }

        for (const [importParent, defs] of unusedByImport) {
          if (importParent.specifiers.length === defs.length) {
            report(
              importParent,
              `All imports from "${importParent.source.value}" are unused and should be removed`,
              function* (fixer) {
                // remove entire import including trailing newline if it's detected
                const textPlus1 = source.getText(importParent, 0, 1);
                const range = getRange(importParent, textPlus1.endsWith('\n') ? 1 : importParent);

                // if the import is preceeded by one or more eslint/tslint disable comments then remove them
                for (const comment of source.getCommentsBefore(importParent)) {
                  if (isTsOrEslintIgnore(comment)) {
                    const cRange = getRange(comment);
                    yield fixer.removeRange(
                      source.text[cRange[1]] !== '\n' ? cRange : getRange(comment, 1)
                    );
                  }
                }

                yield fixer.removeRange(range);
              }
            );
          } else {
            for (const def of defs) {
              report(
                def.node,
                `${def.name.name} is unused and should be removed`,
                function* (fixer) {
                  const nextToken = source.getTokenAfter(def.node);
                  yield fixer.removeRange(
                    getRange(def.node, nextToken?.value === ',' ? nextToken : undefined)
                  );
                }
              );
            }
          }
        }
      },
    };
  },
};

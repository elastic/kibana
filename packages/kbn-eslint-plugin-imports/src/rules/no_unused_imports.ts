/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Rule, Scope, AST } from 'eslint';
import type { Comment } from 'estree';
import * as T from '@babel/types';
import { TSESTree } from '@typescript-eslint/typescript-estree';

import { RUNNING_IN_EDITOR } from '../helpers/running_in_editor';

type WithParent<T> = T & { parent?: WithParent<T> };
type SomeNode = WithParent<T.Node> | TSESTree.Node;
type SomeImportNode = NonNullable<ReturnType<typeof findImportParent>>;

function findImportParent(def: Scope.Definition) {
  let cursor: SomeNode | undefined = def.node;
  while (cursor) {
    if (
      T.isImportDeclaration(cursor) ||
      cursor.type === TSESTree.AST_NODE_TYPES.ImportDeclaration
    ) {
      return cursor;
    }
    cursor = cursor.parent;
  }
  return;
}

function isEslintUsed(variable: any) {
  return !!variable.eslintUsed;
}

function findUnusedImportDefs(globalScope: Scope.Scope) {
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

export const NoUnusedImportsRule: Rule.RuleModule = {
  meta: {
    fixable: 'code',
    docs: {
      url: 'https://github.com/elastic/kibana/blob/main/packages/kbn-eslint-plugin-imports/README.mdx#kbnimportsno_unused_imports',
    },
  },
  create(context) {
    const source = context.getSourceCode();

    function getRange(
      nodeA: { loc?: AST.SourceLocation | null },
      nodeB: { loc?: AST.SourceLocation | null } | number = nodeA
    ): AST.Range {
      if (!nodeA.loc) {
        throw new Error('unable to use babel AST nodes without locations');
      }
      const nodeBLoc = typeof nodeB === 'number' ? nodeB : nodeB.loc;
      if (nodeBLoc == null) {
        throw new Error('unable to use babel AST nodes without locations');
      }
      return [
        source.getIndexFromLoc(nodeA.loc.start),
        typeof nodeBLoc === 'number'
          ? source.getIndexFromLoc(nodeA.loc.end) + nodeBLoc
          : source.getIndexFromLoc(nodeBLoc.end),
      ];
    }

    function report(
      node: SomeNode,
      msg: string,
      fix: (fixer: Rule.RuleFixer) => IterableIterator<Rule.Fix>
    ) {
      context.report({
        node: node as any,
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

    return {
      'Program:exit': () => {
        const unusedByImport = new Map<SomeImportNode, Scope.Definition[]>();
        for (const { importParent, def } of findUnusedImportDefs(context.getScope())) {
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
                const textPlus1 = source.getText(importParent as any, 0, 1);
                const range = getRange(importParent, textPlus1.endsWith('\n') ? 1 : importParent);

                // if the import is preceeded by one or more eslint/tslint disable comments then remove them
                for (const comment of source.getCommentsBefore(importParent as any)) {
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Eslint from 'eslint';

const NAKED_DISABLE_MSG_ID = 'no-naked-eslint-disable';
const messages = {
  [NAKED_DISABLE_MSG_ID]:
    'Using a naked eslint disable is not allowed. Please specify the specific rules to disable.',
};

const meta: Eslint.Rule.RuleMetaData = {
  type: 'problem',
  fixable: 'code',
  docs: {
    description:
      'Prevents declaring naked eslint-disable* comments who do not provide specific rules to disable',
  },
  messages,
};

const nakedEslintDisableRegex =
  /^eslint-disable(?:-next-line|-line)?(?<ruleName>$|(?:\s+(?:@(?:[\w-]+\/){1,2})?[\w-]+)?)/;

const create = (context: Eslint.Rule.RuleContext): Eslint.Rule.RuleListener => {
  return {
    Program(node) {
      const nodeComments = node.comments || [];

      nodeComments.forEach((comment) => {
        const commentVal = comment.value.trim();
        const nakedESLintRegexResult = commentVal.match(nakedEslintDisableRegex);
        const ruleName = nakedESLintRegexResult?.groups?.ruleName;
        const cStartLine = comment?.loc?.start?.line;
        const cEnd = comment?.loc?.end;

        if (!cStartLine || !cEnd) {
          return;
        }

        if (nakedESLintRegexResult && !ruleName) {
          context.report({
            //node,
            loc: {
              start: {
                line: cStartLine,
                // we need to set this to -1 otherwise /* eslint-disable ones won't be reported
                column: -1,
              },
              end: cEnd,
            },
            messageId: NAKED_DISABLE_MSG_ID,
            fix(fixer) {
              return fixer.removeRange(comment.range as Eslint.AST.Range);
            },
          });
        }
      });
    },
  };
};

export const NoNakedESLintDisableRule: Eslint.Rule.RuleModule = {
  meta,
  create,
};

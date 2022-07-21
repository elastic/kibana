/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Eslint from 'eslint';

export const NAKED_DISABLE_MSG_ID = 'no-naked-eslint-disable';
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

const ESLINT_DISABLE_RE =
  /^eslint-disable(?:-next-line|-line)?(?<ruleName>$|(?:\s+(?:@(?:[\w-]+\/){1,2})?[\w-]+)?)/;

const create = (context: Eslint.Rule.RuleContext): Eslint.Rule.RuleListener => {
  return {
    Program(node) {
      const nodeComments = node.comments || [];

      nodeComments.forEach((comment) => {
        const commentVal = comment.value.trim();
        const nakedESLintRegexResult = commentVal.match(ESLINT_DISABLE_RE);
        const ruleName = nakedESLintRegexResult?.groups?.ruleName;

        // no regex match, exit early
        if (!nakedESLintRegexResult) {
          return;
        }

        // we have a rule name, exit early
        if (ruleName) {
          return;
        }

        const cStart = comment?.loc?.start;
        const cEnd = comment?.loc?.end;
        const cStartLine = comment?.loc?.start?.line;

        // start or end loc is undefined, exit early
        if (cStart === undefined || cEnd === undefined || cStartLine === undefined) {
          return;
        }

        const disableStartsOnNextLine = comment.value.includes('disable-next-line');
        const disableStartsInline = comment.value.includes('disable-line');
        const cStartColumn = comment?.loc?.start?.column ?? 0;
        const reportLoc = disableStartsOnNextLine
          ? { start: cStart, end: cEnd }
          : {
              // At this point we could have eslint-disable block or an eslint-disable-line.
              // If we have an inline disable we need to report the column as -1 in order to get the report
              start: { line: cStartLine, column: disableStartsInline ? -1 : cStartColumn - 1 },
              end: cEnd,
            };

        // At this point we have a regex match, no rule name and a valid loc so lets report here
        context.report({
          node,
          loc: reportLoc,
          messageId: NAKED_DISABLE_MSG_ID,
          fix(fixer) {
            return fixer.removeRange(comment.range as Eslint.AST.Range);
          },
        });
      });
    },
  };
};

export const NoNakedESLintDisableRule: Eslint.Rule.RuleModule = {
  meta,
  create,
};

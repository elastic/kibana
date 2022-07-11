/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const NAKED_DISABLE_MSG_ID = 'no-naked-eslint-disable';
const messages = {
  [NAKED_DISABLE_MSG_ID]:
    'Using a naked eslint disable is not allowed. Please specify the specific rules to disable.',
};

const meta = {
  type: 'problem',
  fixable: true,
  docs: {
    description:
      'Prevents declaring naked eslint-disable* comments who do not provide specific rules to disable',
  },
  messages,
};

const nakedEslintDisableRegex =
  /^eslint-disable(?:-next-line|-line)?(?<ruleName>$|(?:\s+(?:@(?:[\w-]+\/){1,2})?[\w-]+)?)/;

/** @param {RuleContext} context */
const create = (context) => {
  return {
    Program(node) {
      const nodeComments = node.comments || [];

      nodeComments.forEach((comment) => {
        const commentVal = comment.value.trim();
        const nakedESLintRegexResult = commentVal.match(nakedEslintDisableRegex);

        if (nakedESLintRegexResult && !nakedESLintRegexResult.groups.ruleName) {
          context.report({
            node,
            loc: {
              start: comment.loc.start,
              end: comment.loc.end,
            },
            messageId: NAKED_DISABLE_MSG_ID,
            fix(fixer) {
              return fixer.remove(comment);
            },
          });
        }
      });
    },
  };
};

/** @type {RuleModule} */
module.exports = {
  meta,
  create,
};

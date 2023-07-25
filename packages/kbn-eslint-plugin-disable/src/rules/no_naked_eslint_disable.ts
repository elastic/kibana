/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Rule, AST } from 'eslint';
import { getReportLocFromComment, parseEslintDisableComment } from '../helpers';

export const NAKED_DISABLE_MSG_ID = 'no-naked-eslint-disable';
const messages = {
  [NAKED_DISABLE_MSG_ID]:
    'Using a naked eslint disable is not allowed. Please specify the specific rules to disable.',
};

const meta: Rule.RuleMetaData = {
  type: 'problem',
  fixable: 'code',
  docs: {
    description:
      'Prevents declaring naked eslint-disable* comments who do not provide specific rules to disable',
  },
  messages,
};

const create = (context: Rule.RuleContext): Rule.RuleListener => {
  return {
    Program(node) {
      const nodeComments = node.comments || [];

      nodeComments.forEach((comment) => {
        // get parsedEslintDisable from comment
        const parsedEslintDisable = parseEslintDisableComment(comment);

        // no regex match, exit early
        if (!parsedEslintDisable) {
          return;
        }

        // we have a rule name so we can exit early
        if (parsedEslintDisable.rules.length > 0) {
          return;
        }

        // collect position to report
        const reportLoc = getReportLocFromComment(parsedEslintDisable);
        if (!reportLoc) {
          return;
        }

        // At this point we have a regex match, no rule name and a valid loc so lets report here
        context.report({
          node,
          loc: reportLoc,
          messageId: NAKED_DISABLE_MSG_ID,
          fix(fixer) {
            return fixer.removeRange(parsedEslintDisable.range as AST.Range);
          },
        });
      });
    },
  };
};

export const NoNakedESLintDisableRule: Rule.RuleModule = {
  meta,
  create,
};

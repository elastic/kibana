/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Rule, AST } from 'eslint';
import { PROTECTED_RULES, getReportLocFromComment, parseEslintDisableComment } from '../helpers';

export const PROTECTED_DISABLE_MSG_ID = 'no-protected-eslint-disable';
const messages = {
  [PROTECTED_DISABLE_MSG_ID]:
    "The rule '{{ disabledRuleName }}' is protected and disabling it is not allowed. Please remove it from the statement.",
};

const meta: Rule.RuleMetaData = {
  type: 'problem',
  fixable: 'code',
  docs: {
    description: 'Prevents the disabling of protected rules within eslint-disable* comments.',
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

        // we do not have a rule block, exit early
        if (parsedEslintDisable.rules.length === 0) {
          return;
        }

        const disabledRules = parsedEslintDisable.rules;
        const disabledProtectedRule = disabledRules.find((r) => PROTECTED_RULES.has(r));

        // no protected rule was disabled, exit early
        if (!disabledProtectedRule) {
          return;
        }

        // at this point we'll collect the disabled rule position to report
        const reportLoc = getReportLocFromComment(parsedEslintDisable);
        if (!reportLoc) {
          return;
        }

        // At this point we have a regex match, no rule name and a valid loc so lets report here
        context.report({
          node,
          loc: reportLoc,
          messageId: PROTECTED_DISABLE_MSG_ID,
          data: {
            disabledRuleName: disabledProtectedRule,
          },
          fix(fixer) {
            // if we only have a single disabled rule and that is protected, we can remove the entire comment
            if (disabledRules.length === 1) {
              return fixer.removeRange(parsedEslintDisable.range as AST.Range);
            }

            // it's impossible to fix as we don't have a range
            if (!parsedEslintDisable.range) {
              return null;
            }

            const remainingRules = disabledRules.filter((rule) => !PROTECTED_RULES.has(rule));
            const fixedComment = ` ${parsedEslintDisable.disableValueType} ${remainingRules.join(
              ', '
            )}${parsedEslintDisable.type === 'Block' ? ' ' : ''}`;
            const rangeToFix: AST.Range =
              parsedEslintDisable.type === 'Line'
                ? [parsedEslintDisable.range[0] + 2, parsedEslintDisable.range[1]]
                : [parsedEslintDisable.range[0] + 2, parsedEslintDisable.range[1] - 2];

            return fixer.replaceTextRange(rangeToFix, fixedComment);
          },
        });
      });
    },
  };
};

export const NoProtectedESLintDisableRule: Rule.RuleModule = {
  meta,
  create,
};

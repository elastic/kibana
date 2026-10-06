/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CreateOnceRule, Range, RuleMeta } from '@oxlint/plugins';
import { PROTECTED_RULES, getReportLocFromComment, parseDisableComment } from '../helpers';

export const PROTECTED_DISABLE_MSG_ID = 'no-protected-eslint-disable';
const messages = {
  [PROTECTED_DISABLE_MSG_ID]:
    "The rule '{{ disabledRuleName }}' is protected and disabling it is not allowed. Please remove it from the statement.",
};

const meta: RuleMeta = {
  type: 'problem',
  fixable: 'code',
  docs: {
    description:
      'Prevents the disabling of protected rules within eslint-disable* or oxlint-disable* comments.',
  },
  messages,
};

export const NoProtectedESLintDisableRule: CreateOnceRule = {
  meta,
  createOnce: (context) => ({
    Program(node) {
      for (const comment of context.sourceCode.getAllComments()) {
        const parsedDisable = parseDisableComment(comment);

        // no regex match or no rule block, exit early
        if (!parsedDisable || parsedDisable.rules.length === 0) {
          continue;
        }

        const disabledRules = parsedDisable.rules;
        const disabledProtectedRule = disabledRules.find((r) => PROTECTED_RULES.has(r));

        // no protected rule was disabled, exit early
        if (!disabledProtectedRule) {
          continue;
        }

        context.report({
          node,
          loc: getReportLocFromComment(parsedDisable),
          messageId: PROTECTED_DISABLE_MSG_ID,
          data: {
            disabledRuleName: disabledProtectedRule,
          },
          fix(fixer) {
            const { range } = parsedDisable;

            // if we only have a single disabled rule and that is protected, we can remove the entire comment
            if (disabledRules.length === 1) {
              return fixer.removeRange(range);
            }

            const remainingRules = disabledRules.filter((rule) => !PROTECTED_RULES.has(rule));
            const fixedComment = ` ${parsedDisable.directive} ${remainingRules.join(', ')}${
              parsedDisable.type === 'Block' ? ' ' : ''
            }`;
            const rangeToFix: Range =
              parsedDisable.type === 'Line'
                ? [range[0] + 2, range[1]]
                : [range[0] + 2, range[1] - 2];

            return fixer.replaceTextRange(rangeToFix, fixedComment);
          },
        });
      }
    },
  }),
};

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
        const disabledProtectedRule = parsedDisable?.rules.find((rule) =>
          PROTECTED_RULES.has(rule)
        );

        // not a disable comment, or no protected rule was disabled
        if (!parsedDisable || !disabledProtectedRule) {
          continue;
        }

        context.report({
          node,
          loc: getReportLocFromComment(comment, parsedDisable.disableValueType),
          messageId: PROTECTED_DISABLE_MSG_ID,
          data: {
            disabledRuleName: disabledProtectedRule,
          },
          fix(fixer) {
            const { range, type } = comment;
            const { directive, rules, description } = parsedDisable;
            const remainingRules = rules.filter((rule) => !PROTECTED_RULES.has(rule));

            // every disabled rule is protected, so the whole comment goes
            if (remainingRules.length === 0) {
              return fixer.removeRange(range);
            }

            const fixedComment = ` ${directive} ${remainingRules.join(', ')}${description}${
              type === 'Block' ? ' ' : ''
            }`;
            const rangeToFix: Range =
              type === 'Line' ? [range[0] + 2, range[1]] : [range[0] + 2, range[1] - 2];

            return fixer.replaceTextRange(rangeToFix, fixedComment);
          },
        });
      }
    },
  }),
};

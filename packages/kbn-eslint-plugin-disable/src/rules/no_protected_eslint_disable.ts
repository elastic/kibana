/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { REPO_ROOT } from '@kbn/utils';
import { relative } from 'path';
import Eslint from 'eslint';
import { PROTECTED_RULES, getReportLocFromComment, parseEslintDisableComment } from '../helpers';

export const PROTECTED_DISABLE_MSG_ID = 'no-protected-eslint-disable';
const messages = {
  [PROTECTED_DISABLE_MSG_ID]:
    "The rule '{{ disabledRuleName }}' is protected and disabling it is not allowed. Please remove it from the statement.",
};

const meta: Eslint.Rule.RuleMetaData = {
  type: 'problem',
  fixable: 'code',
  docs: {
    description: 'Prevents the disabling of protected rules within eslint-disable* comments.',
  },
  messages,
};

const getDisabledProtectedRule = function (
  sourceFilename: string,
  disabledRules: string[],
  protectedRules: any
) {
  for (const disabledRule of disabledRules) {
    if (!protectedRules[disabledRule]) {
      continue;
    }

    if (protectedRules[disabledRule] === '*') {
      return disabledRule;
    }

    const relativeSourceFileName = relative(REPO_ROOT, sourceFilename);
    const isSourceFileAllowedToDisableThisProtectedRule = protectedRules[disabledRule].some(
      (allowedPath: string) => relativeSourceFileName.startsWith(allowedPath)
    );

    if (!isSourceFileAllowedToDisableThisProtectedRule) {
      return disabledRule;
    }
  }
  return false;
};

const create = (context: Eslint.Rule.RuleContext): Eslint.Rule.RuleListener => {
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

        const configuredProtectedRules = PROTECTED_RULES;
        const disabledRules = parsedEslintDisable.rules;
        const sourceFilename = context.getPhysicalFilename
          ? context.getPhysicalFilename()
          : context.getFilename();

        const disabledProtectedRule = getDisabledProtectedRule(
          sourceFilename,
          disabledRules,
          configuredProtectedRules
        );

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
              return fixer.removeRange(parsedEslintDisable.range as Eslint.AST.Range);
            }

            // it's impossible to fix as we don't have a range
            if (!parsedEslintDisable.range) {
              return null;
            }

            const isLastDisabledRule =
              disabledRules[disabledRules.length - 1] === disabledProtectedRule;
            const textToRemove = isLastDisabledRule
              ? `,${disabledProtectedRule}`
              : `${disabledProtectedRule},`;
            const fixedComment = parsedEslintDisable.value.replace(textToRemove, '');
            const rangeToFix: Eslint.AST.Range =
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

export const NoProtectedESLintDisableRule: Eslint.Rule.RuleModule = {
  meta,
  create,
};

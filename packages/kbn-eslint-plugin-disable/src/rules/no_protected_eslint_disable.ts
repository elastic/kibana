/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Eslint from 'eslint';

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
  schema: {
    type: 'array',
    uniqueItems: true,
    items: {
      type: ['string', 'array'],
      items: {
        properties: {
          allowed: {
            type: 'array',
            uniqueItems: true,
            items: {
              type: 'string',
            },
          },
        },
      },
    },
  },
};

const ESLINT_DISABLE_RE = /^eslint-disable(?:-next-line|-line)?(?<rulesBlock>.*)/;

const getProtectedRulesFromOptions = function (ruleOptions: any[]) {
  const protectedRules: { [key: string]: string | string[] } = {};

  for (const ruleOption of ruleOptions) {
    if (typeof ruleOption === 'string') {
      protectedRules[ruleOption] = '*';
    }

    if (Array.isArray(ruleOption)) {
      protectedRules[ruleOption[0]] = ruleOption[1].allowed;
    }
  }

  return protectedRules;
};

const getDisabledProtectedRule = function (
  sourceFilename: string,
  disabledRules: string[],
  protectedRules: any
) {
  for (const disabledRule of disabledRules) {
    if (
      protectedRules[disabledRule] === '*' ||
      sourceFilename.includes(protectedRules[disabledRule])
    ) {
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
        const commentVal = comment.value.trim();
        const eslintDisableRegexResult = commentVal.match(ESLINT_DISABLE_RE);
        const rulesBlock = eslintDisableRegexResult?.groups?.rulesBlock;

        // no regex match, exit early
        if (!eslintDisableRegexResult) {
          return;
        }

        // we do not have a rule block, exit early
        if (!rulesBlock) {
          return;
        }

        const configuredProtectedRules = getProtectedRulesFromOptions(context.options[0]);
        const disabledRules = rulesBlock.trim().split(',');
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
          messageId: PROTECTED_DISABLE_MSG_ID,
          data: {
            disabledRuleName: disabledProtectedRule,
          },
          fix(fixer) {
            // if we only have a single disabled rule and that is protected, we can remove the entire comment
            if (disabledRules.length === 1) {
              return fixer.removeRange(comment.range as Eslint.AST.Range);
            }

            // its impossible to fix as we dont have a range
            if (!comment.range) {
              return null;
            }

            const isLastDisabledRule =
              disabledRules[disabledRules.length - 1] === disabledProtectedRule;
            const textToRemove = isLastDisabledRule
              ? `,${disabledProtectedRule}`
              : `${disabledProtectedRule},`;
            const fixedComment = comment.value.trim().replace(textToRemove, '');
            const rangeToFix: Eslint.AST.Range =
              comment.type === 'Line'
                ? [comment.range[0] + 3, comment.range[1]]
                : [comment.range[0] + 3, comment.range[1] - 3];

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

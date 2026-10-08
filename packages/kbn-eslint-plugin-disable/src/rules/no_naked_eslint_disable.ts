/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CreateOnceRule, RuleMeta } from '@oxlint/plugins';
import { getReportLocFromComment, parseDisableComment } from '../helpers';

export const NAKED_DISABLE_MSG_ID = 'no-naked-eslint-disable';
const messages = {
  [NAKED_DISABLE_MSG_ID]:
    'Using a naked eslint disable is not allowed. Please specify the specific rules to disable.',
};

const meta: RuleMeta = {
  type: 'problem',
  fixable: 'code',
  docs: {
    description:
      'Prevents declaring naked eslint-disable* or oxlint-disable* comments who do not provide specific rules to disable',
  },
  messages,
};

export const NoNakedESLintDisableRule: CreateOnceRule = {
  meta,
  createOnce: (context) => ({
    Program(node) {
      for (const comment of context.sourceCode.getAllComments()) {
        const parsedDisable = parseDisableComment(comment);

        // no regex match, or we have a rule name, so we can exit early
        if (!parsedDisable || parsedDisable.rules.length > 0) {
          continue;
        }

        context.report({
          node,
          loc: getReportLocFromComment(comment, parsedDisable.disableValueType),
          messageId: NAKED_DISABLE_MSG_ID,
          fix: (fixer) => fixer.removeRange(comment.range),
        });
      }
    },
  }),
};

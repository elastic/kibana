/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import { columnsAfter } from './columns_after';
import { autocomplete } from './autocomplete';
import { validate } from './validate';
import { summary } from './summary';
import type { ICommandContext } from '../types';
import type { ICommandMethods } from '../registry';

const inlineStatsCommandMethods: ICommandMethods<ICommandContext> = {
  autocomplete,
  validate,
  columnsAfter,
  summary,
};

export const inlineStatsCommand = {
  name: 'inline stats',
  methods: inlineStatsCommandMethods,
  metadata: {
    hidden: false,
    preview: false,
    description: i18n.translate('kbn-esql-language.esql.definitions.inlineStatsDoc', {
      defaultMessage:
        'Unlike STATS, INLINE STATS preserves all columns from the previous pipe and returns them together with the new aggregate columns.',
    }),
    declaration: `INLINE STATS [column1 =] expression1 [WHERE boolean_expression1][,
...,
[columnN =] expressionN [WHERE boolean_expressionN]]
[BY grouping_expression1[, ..., grouping_expressionN]]`,
    examples: [
      '… | INLINE STATS avg = avg(a)',
      '… | INLINE STATS sum(b) BY b',
      '… | INLINE STATS sum(b) BY b % 2',
    ],
    subqueryRestrictions: {
      hideInside: false,
      hideOutside: true,
    },
  },
};

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
import { autocomplete } from '../stats/autocomplete';
import { validate } from '../stats/validate';
import type { ICommandContext } from '../../types';
import type { ICommandMethods } from '../../registry';

const inlineStatsCommandMethods: ICommandMethods<ICommandContext> = {
  autocomplete,
  validate,
  columnsAfter,
};

export const inlineStatsCommand = {
  name: 'inlinestats',
  methods: inlineStatsCommandMethods,
  metadata: {
    hidden: true,
    description: i18n.translate('kbn-esql-ast.esql.definitions.inlineStatsDoc', {
      defaultMessage:
        'Unlike STATS, INLINESTATS preserves all columns from the previous pipe and returns them together with the new aggregate columns.',
    }),
    declaration: `INLINESTATS [column1 =] expression1 [WHERE boolean_expression1][,
      ...,
      [columnN =] expressionN [WHERE boolean_expressionN]]
      [BY grouping_expression1[, ..., grouping_expressionN]]`,
    examples: [
      '… | inlinestats avg = avg(a)',
      '… | inlinestats sum(b) by b',
      '… | inlinestats sum(b) by b % 2',
    ],
  },
};

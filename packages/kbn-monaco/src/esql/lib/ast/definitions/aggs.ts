/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { FunctionDefinition } from './types';

function createNumericAggDefinition({
  name,
  description,
}: {
  name: string;
  description: string;
}): FunctionDefinition {
  return {
    name,
    description,
    supportedCommands: ['stats'],
    signatures: [
      {
        params: [{ name: 'colum', type: 'number', noNestingFunctions: true }],
        returnType: 'number',
        examples: [
          `from index | stats result = ${name}(field)`,
          `from index | stats ${name}(field)`,
        ],
      },
    ],
  };
}

export const statsAggregationFunctionDefinitions: FunctionDefinition[] = [
  {
    name: 'avg',
    description: i18n.translate('monaco.esql.definitions.avgDoc', {
      defaultMessage: 'Returns the average of the values in a field',
    }),
  },
  {
    name: 'max',
    description: i18n.translate('monaco.esql.definitions.maxDoc', {
      defaultMessage: 'Returns the maximum value in a field.',
    }),
  },
  {
    name: 'min',
    description: i18n.translate('monaco.esql.definitions.minDoc', {
      defaultMessage: 'Returns the minimum value in a field.',
    }),
  },
  {
    name: 'sum',
    description: i18n.translate('monaco.esql.definitions.sumDoc', {
      defaultMessage: 'Returns the sum of the values in a field.',
    }),
  },
  {
    name: 'count',
    description: i18n.translate('monaco.esql.definitions.countDoc', {
      defaultMessage: 'Returns the count of the values in a field.',
    }),
  },
  {
    name: 'count_distinct',
    description: i18n.translate('monaco.esql.definitions.countDistinctDoc', {
      defaultMessage: 'Returns the count of distinct values in a field.',
    }),
  },
  {
    name: 'median',
    description: i18n.translate('monaco.esql.definitions.medianDoc', {
      defaultMessage: 'Returns the 50% percentile.',
    }),
  },
  {
    name: 'median_absolute_deviation',
    description: i18n.translate('monaco.esql.definitions.medianDeviationDoc', {
      defaultMessage:
        'Returns the median of each data point’s deviation from the median of the entire sample.',
    }),
  },
]
  .map(createNumericAggDefinition)
  .concat({
    name: 'percentile',
    description: i18n.translate('monaco.esql.definitions.percentiletDoc', {
      defaultMessage: 'Returns the n percentile of a field.',
    }),
    supportedCommands: ['stats'],
    signatures: [
      {
        params: [
          { name: 'colum', type: 'number', noNestingFunctions: true },
          { name: 'percentile', type: 'number', noNestingFunctions: true },
        ],
        returnType: 'number',
        examples: [
          `from index | stats result = percentile(field, 90)`,
          `from index | stats percentile(field, 90)`,
        ],
      },
    ],
  });

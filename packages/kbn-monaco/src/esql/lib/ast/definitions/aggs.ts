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
    description: i18n.translate('monaco.esql.autocomplete.avgDoc', {
      defaultMessage: 'Returns the average of the values in a field',
    }),
  },
  {
    name: 'max',
    description: i18n.translate('monaco.esql.autocomplete.maxDoc', {
      defaultMessage: 'Returns the maximum value in a field.',
    }),
  },
  {
    name: 'min',
    description: i18n.translate('monaco.esql.autocomplete.minDoc', {
      defaultMessage: 'Returns the minimum value in a field.',
    }),
  },
  {
    name: 'sum',
    description: i18n.translate('monaco.esql.autocomplete.sumDoc', {
      defaultMessage: 'Returns the sum of the values in a field.',
    }),
  },
  {
    name: 'count',
    description: i18n.translate('monaco.esql.autocomplete.countDoc', {
      defaultMessage: 'Returns the count of the values in a field.',
    }),
  },
  {
    name: 'count_distinct',
    description: i18n.translate('monaco.esql.autocomplete.countDistinctDoc', {
      defaultMessage: 'Returns the count of distinct values in a field.',
    }),
  },
  {
    name: 'median',
    description: i18n.translate('monaco.esql.autocomplete.medianDoc', {
      defaultMessage: 'Returns the 50% percentile.',
    }),
  },
  {
    name: 'median_absolute_deviation',
    description: i18n.translate('monaco.esql.autocomplete.medianDeviationDoc', {
      defaultMessage:
        'Returns the median of each data point’s deviation from the median of the entire sample.',
    }),
  },
]
  .map(createNumericAggDefinition)
  .concat({
    name: 'percentile',
    description: i18n.translate('monaco.esql.autocomplete.percentiletDoc', {
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

//   {
//     label: 'avg',
//     insertText: 'avg',
//     kind: 1,
//     detail: i18n.translate('monaco.esql.autocomplete.avgDoc', {
//       defaultMessage: 'Returns the average of the values in a field',
//     }),
//     documentation: {
//       value: buildDocumentation('avg(grouped[T]): aggregated[T]', [
//         'from index | stats average = avg(field)',
//       ]),
//     },
//     sortText: 'C',
//   },
//   {
//     label: 'max',
//     insertText: 'max',
//     kind: 1,
//     detail: i18n.translate('monaco.esql.autocomplete.maxDoc', {
//       defaultMessage: 'Returns the maximum value in a field.',
//     }),
//     documentation: {
//       value: buildDocumentation('max(grouped[T]): aggregated[T]', [
//         'from index | stats max = max(field)',
//       ]),
//     },
//     sortText: 'C',
//   },
//   {
//     label: 'min',
//     insertText: 'min',
//     kind: 1,
//     detail: i18n.translate('monaco.esql.autocomplete.minDoc', {
//       defaultMessage: 'Returns the minimum value in a field.',
//     }),
//     documentation: {
//       value: buildDocumentation('min(grouped[T]): aggregated[T]', [
//         'from index | stats min = min(field)',
//       ]),
//     },
//     sortText: 'C',
//   },
//   {
//     label: 'sum',
//     insertText: 'sum',
//     kind: 1,
//     detail: i18n.translate('monaco.esql.autocomplete.sumDoc', {
//       defaultMessage: 'Returns the sum of the values in a field.',
//     }),
//     documentation: {
//       value: buildDocumentation('sum(grouped[T]): aggregated[T]', [
//         'from index | stats sum = sum(field)',
//       ]),
//     },
//     sortText: 'C',
//   },
//   {
//     label: 'count',
//     insertText: 'count',
//     kind: 1,
//     detail: i18n.translate('monaco.esql.autocomplete.countDoc', {
//       defaultMessage: 'Returns the count of the values in a field.',
//     }),
//     documentation: {
//       value: buildDocumentation('count(grouped[T]): aggregated[T]', [
//         'from index | stats count = count(field)',
//       ]),
//     },
//     sortText: 'C',
//   },
//   {
//     label: 'count_distinct',
//     insertText: 'count_distinct',
//     kind: 1,
//     detail: i18n.translate('monaco.esql.autocomplete.countDistinctDoc', {
//       defaultMessage: 'Returns the count of distinct values in a field.',
//     }),
//     documentation: {
//       value: buildDocumentation('count(grouped[T]): aggregated[T]', [
//         'from index | stats count = count_distinct(field)',
//       ]),
//     },
//     sortText: 'C',
//   },
//   {
//     label: 'median',
//     insertText: 'median',
//     kind: 1,
//     detail: i18n.translate('monaco.esql.autocomplete.medianDoc', {
//       defaultMessage: 'Returns the 50% percentile.',
//     }),
//     documentation: {
//       value: buildDocumentation('count(grouped[T]): aggregated[T]', [
//         'from index | stats count = median(field)',
//       ]),
//     },
//     sortText: 'C',
//   },
//   {
//     label: 'median_absolute_deviation',
//     insertText: 'median_absolute_deviation',
//     kind: 1,
//     detail: i18n.translate('monaco.esql.autocomplete.medianDeviationDoc', {
//       defaultMessage:
//         'Returns the median of each data point’s deviation from the median of the entire sample.',
//     }),
//     documentation: {
//       value: buildDocumentation('count(grouped[T]): aggregated[T]', [
//         'from index | stats count = median_absolute_deviation(field)',
//       ]),
//     },
//     sortText: 'C',
//   },
//   {
//     label: 'percentile',
//     insertText: 'percentile',
//     kind: 1,
//     detail: i18n.translate('monaco.esql.autocomplete.percentiletDoc', {
//       defaultMessage: 'Returns the n percentile of a field.',
//     }),
//     documentation: {
//       value: buildDocumentation('percentile(grouped[T]): aggregated[T]', [
//         'from index | stats pct = percentile(field, 90)',
//       ]),
//     },
//     sortText: 'C',
//   },
// ];

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { ESQL_COMMON_NUMERIC_TYPES, ESQL_NUMBER_TYPES } from '../shared/esql_types';
import type { FunctionDefinition, FunctionParameterType, FunctionReturnType } from './types';

function createNumericAggDefinition({
  name,
  description,
  returnType,
  args = [],
}: {
  name: string;
  description: string;
  returnType?: (numericType: FunctionParameterType) => FunctionReturnType;
  args?: Array<{
    name: string;
    type: FunctionParameterType;
    value: string;
    constantOnly?: boolean;
  }>;
}): FunctionDefinition {
  const extraParamsExample = args.length ? `, ${args.map(({ value }) => value).join(',')}` : '';
  return {
    name,
    type: 'agg',
    description,
    supportedCommands: ['stats', 'inlinestats', 'metrics'],
    signatures: [
      ...ESQL_NUMBER_TYPES.map((numericType) => ({
        params: [
          { name: 'column', type: numericType, noNestingFunctions: true },
          ...args.map(({ name: paramName, type, constantOnly }) => ({
            name: paramName,
            type,
            noNestingFunctions: true,
            constantOnly,
          })),
        ],
        returnType: returnType ? returnType(numericType) : numericType,
      })),
    ],
    examples: [
      `from index | stats result = ${name}(field${extraParamsExample})`,
      `from index | stats ${name}(field${extraParamsExample})`,
    ],
  };
}

export const statsAggregationFunctionDefinitions: FunctionDefinition[] = [
  {
    name: 'avg',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.avgDoc', {
      defaultMessage: 'Returns the average of the values in a field',
    }),
    returnType: () => 'double' as FunctionReturnType,
  },
  {
    name: 'sum',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.sumDoc', {
      defaultMessage: 'Returns the sum of the values in a field.',
    }),
    returnType: (numericType: FunctionParameterType): FunctionReturnType => {
      switch (numericType) {
        case 'double':
          return 'double';
        default:
          return 'long';
      }
    },
  },
  {
    name: 'median',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.medianDoc', {
      defaultMessage: 'Returns the 50% percentile.',
    }),
    returnType: () => 'double' as FunctionReturnType,
  },
  {
    name: 'median_absolute_deviation',
    description: i18n.translate(
      'kbn-esql-validation-autocomplete.esql.definitions.medianDeviationDoc',
      {
        defaultMessage:
          'Returns the median of each data point’s deviation from the median of the entire sample.',
      }
    ),
    returnType: () => 'double' as FunctionReturnType,
  },
]
  .map(createNumericAggDefinition)
  .concat([
    {
      name: 'percentile',
      description: i18n.translate(
        'kbn-esql-validation-autocomplete.esql.definitions.percentiletDoc',
        {
          defaultMessage: 'Returns the n percentile of a field.',
        }
      ),
      type: 'agg',
      supportedCommands: ['stats', 'inlinestats', 'metrics'],
      signatures: [
        ...ESQL_COMMON_NUMERIC_TYPES.map((numericType: FunctionParameterType) => {
          return ESQL_COMMON_NUMERIC_TYPES.map((weightType: FunctionParameterType) => ({
            params: [
              {
                name: 'column',
                type: numericType,
                noNestingFunctions: true,
              },
              {
                name: 'percentile',
                type: weightType,
                noNestingFunctions: true,
                constantOnly: true,
              },
            ],
            returnType: 'double' as FunctionReturnType,
          }));
        }).flat(),
      ],
    },
    {
      name: 'max',
      description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.maxDoc', {
        defaultMessage: 'Returns the maximum value in a field.',
      }),
      type: 'agg',
      supportedCommands: ['stats', 'inlinestats', 'metrics'],
      signatures: [
        ...ESQL_COMMON_NUMERIC_TYPES.map((type) => ({
          params: [{ name: 'column', type, noNestingFunctions: true }],
          returnType: type,
        })),
        {
          params: [{ name: 'column', type: 'date', noNestingFunctions: true }],
          returnType: 'date',
        },
        {
          params: [{ name: 'column', type: 'date_period', noNestingFunctions: true }],
          returnType: 'date_period',
        },
        {
          params: [{ name: 'column', type: 'boolean', noNestingFunctions: true }],
          returnType: 'boolean',
        },
        {
          params: [{ name: 'column', type: 'ip', noNestingFunctions: true }],
          returnType: 'ip',
        },
        {
          params: [{ name: 'column', type: 'version', noNestingFunctions: true }],
          returnType: 'version',
        },
        {
          params: [{ name: 'column', type: 'keyword', noNestingFunctions: true }],
          returnType: 'keyword',
        },
        {
          params: [{ name: 'column', type: 'text', noNestingFunctions: true }],
          returnType: 'text',
        },
      ],
      examples: [`from index | stats result = max(field)`, `from index | stats max(field)`],
    },
    {
      name: 'min',
      description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.minDoc', {
        defaultMessage: 'Returns the minimum value in a field.',
      }),
      type: 'agg',
      supportedCommands: ['stats', 'inlinestats', 'metrics'],
      signatures: [
        ...ESQL_COMMON_NUMERIC_TYPES.map((type) => ({
          params: [{ name: 'column', type, noNestingFunctions: true }],
          returnType: type,
        })),
        {
          params: [{ name: 'column', type: 'date', noNestingFunctions: true }],
          returnType: 'date',
        },
        {
          params: [{ name: 'column', type: 'date_period', noNestingFunctions: true }],
          returnType: 'date_period',
        },
        {
          params: [{ name: 'column', type: 'boolean', noNestingFunctions: true }],
          returnType: 'boolean',
        },
        {
          params: [{ name: 'column', type: 'ip', noNestingFunctions: true }],
          returnType: 'ip',
        },
        {
          params: [{ name: 'column', type: 'version', noNestingFunctions: true }],
          returnType: 'version',
        },
        {
          params: [{ name: 'column', type: 'keyword', noNestingFunctions: true }],
          returnType: 'keyword',
        },
        {
          params: [{ name: 'column', type: 'text', noNestingFunctions: true }],
          returnType: 'text',
        },
      ],
      examples: [`from index | stats result = min(field)`, `from index | stats min(field)`],
    },
  ])
  .concat([
    {
      name: 'count',
      type: 'agg',
      description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.countDoc', {
        defaultMessage: 'Returns the count of the values in a field.',
      }),
      supportedCommands: ['stats', 'inlinestats', 'metrics'],
      signatures: [
        {
          params: [
            {
              name: 'column',
              type: 'any',
              noNestingFunctions: true,
              supportsWildcard: true,
              optional: true,
            },
          ],
          returnType: 'long',
        },
      ],
      examples: [`from index | stats result = count(field)`, `from index | stats count(field)`],
    },
    {
      name: 'count_distinct',
      type: 'agg',
      description: i18n.translate(
        'kbn-esql-validation-autocomplete.esql.definitions.countDistinctDoc',
        {
          defaultMessage: 'Returns the count of distinct values in a field.',
        }
      ),
      supportedCommands: ['stats', 'inlinestats', 'metrics'],
      signatures: [
        {
          params: [
            { name: 'column', type: 'any', noNestingFunctions: true },
            ...ESQL_NUMBER_TYPES.map((type) => ({
              name: 'precision',
              type,
              noNestingFunctions: true,
              optional: true,
            })),
          ],
          returnType: 'long',
        },
      ],
      examples: [
        `from index | stats result = count_distinct(field)`,
        `from index | stats count_distinct(field)`,
      ],
    },
    {
      name: 'st_centroid_agg',
      type: 'agg',
      description: i18n.translate(
        'kbn-esql-validation-autocomplete.esql.definitions.stCentroidDoc',
        {
          defaultMessage: 'Returns the count of distinct values in a field.',
        }
      ),
      supportedCommands: ['stats', 'inlinestats', 'metrics'],
      signatures: [
        {
          params: [{ name: 'column', type: 'cartesian_point', noNestingFunctions: true }],
          returnType: 'cartesian_point',
        },
        {
          params: [{ name: 'column', type: 'geo_point', noNestingFunctions: true }],
          returnType: 'geo_point',
        },
      ],
      examples: [
        `from index | stats result = st_centroid_agg(cartesian_field)`,
        `from index | stats st_centroid_agg(cartesian_field)`,
        `from index | stats result = st_centroid_agg(geo_field)`,
        `from index | stats st_centroid_agg(geo_field)`,
      ],
    },
    {
      name: 'values',
      type: 'agg',
      description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.values', {
        defaultMessage: 'Returns all values in a group as an array.',
      }),
      supportedCommands: ['stats', 'metrics'],
      signatures: [
        {
          params: [{ name: 'expression', type: 'any', noNestingFunctions: true }],
          returnType: 'any',
        },
      ],
      examples: [
        'from index | stats all_agents=values(agents.keyword)',
        'from index | stats all_sorted_agents=mv_sort(values(agents.keyword))',
      ],
    },
    {
      name: 'top',
      type: 'agg',
      description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.topListDoc', {
        defaultMessage: 'Collects top N values per bucket.',
      }),
      supportedCommands: ['stats', 'metrics'],
      signatures: [
        {
          params: [
            {
              name: 'field',
              type: 'any',
              noNestingFunctions: true,
              optional: false,
            },
            {
              name: 'limit',
              type: 'integer',
              noNestingFunctions: true,
              optional: false,
              constantOnly: true,
            },
            {
              name: 'order',
              type: 'keyword',
              noNestingFunctions: true,
              optional: false,
              constantOnly: true,
              literalOptions: ['asc', 'desc'],
            },
          ],
          returnType: 'any',
        },
      ],
      examples: [
        `from employees | stats top_salaries = top(salary, 10, "desc")`,
        `from employees | stats date = top(hire_date, 2, "asc"), double = top(salary_change, 2, "asc"),`,
      ],
    },
    {
      name: 'weighted_avg',
      type: 'agg',
      description: i18n.translate(
        'kbn-esql-validation-autocomplete.esql.definitions.weightedAvgDoc',
        {
          defaultMessage:
            'An aggregation that computes the weighted average of numeric values that are extracted from the aggregated documents.',
        }
      ),
      supportedCommands: ['stats', 'inlinestats', 'metrics'],
      signatures: [
        ...ESQL_COMMON_NUMERIC_TYPES.map((numericType: FunctionParameterType) => {
          return ESQL_COMMON_NUMERIC_TYPES.map((weightType: FunctionParameterType) => ({
            params: [
              {
                name: 'number',
                type: numericType,
                noNestingFunctions: true,
                optional: false,
              },
              {
                name: 'weight',
                type: weightType,
                noNestingFunctions: true,
                optional: false,
              },
            ],
            returnType: 'double' as FunctionReturnType,
          }));
        }).flat(),
      ],
      examples: [
        `from employees | stats w_avg = weighted_avg(salary, height) by languages | eval w_avg = round(w_avg)`,
        `from employees | stats w_avg_1 = weighted_avg(salary, 1), avg = avg(salary), w_avg_2 = weighted_avg(salary, height)`,
      ],
    },
  ]);

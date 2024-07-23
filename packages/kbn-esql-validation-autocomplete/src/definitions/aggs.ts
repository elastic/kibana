/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ESQL_COMMON_NUMERIC_TYPES, ESQL_NUMBER_TYPES } from '@kbn/esql-ast/src/constants';
import { i18n } from '@kbn/i18n';
import type { FunctionDefinition, FunctionParameterType } from './types';

function createNumericAggDefinition({
  name,
  description,
  args = [],
}: {
  name: string;
  description: string;
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
    supportedCommands: ['stats', 'metrics'],
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
        returnType: numericType,
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
  },
  {
    name: 'sum',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.sumDoc', {
      defaultMessage: 'Returns the sum of the values in a field.',
    }),
  },
  {
    name: 'median',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.medianDoc', {
      defaultMessage: 'Returns the 50% percentile.',
    }),
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
  },
  {
    name: 'percentile',
    description: i18n.translate(
      'kbn-esql-validation-autocomplete.esql.definitions.percentiletDoc',
      {
        defaultMessage: 'Returns the n percentile of a field.',
      }
    ),
    args: [
      ...ESQL_NUMBER_TYPES.map((type) => ({
        name: 'percentile',
        type,
        value: '90',
        constantOnly: true,
      })),
    ],
  },
]
  .map(createNumericAggDefinition)
  .concat([
    {
      name: 'max',
      description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.maxDoc', {
        defaultMessage: 'Returns the maximum value in a field.',
      }),
      type: 'agg',
      supportedCommands: ['stats', 'metrics'],
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
          params: [{ name: 'column', type: 'boolean', noNestingFunctions: true }],
          returnType: 'boolean',
        },
        {
          params: [{ name: 'column', type: 'ip', noNestingFunctions: true }],
          returnType: 'ip',
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
      supportedCommands: ['stats', 'metrics'],
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
          params: [{ name: 'column', type: 'boolean', noNestingFunctions: true }],
          returnType: 'boolean',
        },
        {
          params: [{ name: 'column', type: 'ip', noNestingFunctions: true }],
          returnType: 'ip',
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
      supportedCommands: ['stats', 'metrics'],
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
      supportedCommands: ['stats', 'metrics'],
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
      supportedCommands: ['stats', 'metrics'],
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
              type: 'string',
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
      supportedCommands: ['stats', 'metrics'],
      signatures: [
        {
          // @TODO  @Q: Verify how can we support multiple numeric types
          params: [
            {
              name: 'number',
              type: 'double',
              noNestingFunctions: true,
              optional: false,
            },
            {
              name: 'weight',
              type: 'double',
              noNestingFunctions: true,
              optional: false,
            },
          ],
          returnType: 'double',
        },
      ],
      examples: [
        `from employees | stats w_avg = weighted_avg(salary, height) by languages | eval w_avg = round(w_avg)`,
        `from employees | stats w_avg_1 = weighted_avg(salary, 1), avg = avg(salary), w_avg_2 = weighted_avg(salary, height)`,
      ],
    },
  ]);

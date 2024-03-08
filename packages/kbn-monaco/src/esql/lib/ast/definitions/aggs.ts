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
  args = [],
}: {
  name: string;
  description: string;
  args?: Array<{ name: string; type: string; value: string; literalOnly?: boolean }>;
}): FunctionDefinition {
  const extraParamsExample = args.length ? `, ${args.map(({ value }) => value).join(',')}` : '';
  return {
    name,
    type: 'agg',
    description,
    supportedCommands: ['stats'],
    signatures: [
      {
        params: [
          { name: 'column', type: 'number', noNestingFunctions: true },
          ...args.map(({ name: paramName, type, literalOnly }) => ({
            name: paramName,
            type,
            noNestingFunctions: true,
            literalOnly,
          })),
        ],
        returnType: 'number',
        examples: [
          `from index | stats result = ${name}(field${extraParamsExample})`,
          `from index | stats ${name}(field${extraParamsExample})`,
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
  {
    name: 'percentile',
    description: i18n.translate('monaco.esql.definitions.percentiletDoc', {
      defaultMessage: 'Returns the n percentile of a field.',
    }),
    args: [{ name: 'percentile', type: 'number', value: '90', literalOnly: true }],
  },
]
  .map(createNumericAggDefinition)
  .concat([
    {
      name: 'count',
      type: 'agg',
      description: i18n.translate('monaco.esql.definitions.countDoc', {
        defaultMessage: 'Returns the count of the values in a field.',
      }),
      supportedCommands: ['stats'],
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
          returnType: 'number',
          examples: [`from index | stats result = count(field)`, `from index | stats count(field)`],
        },
      ],
    },
    {
      name: 'count_distinct',
      type: 'agg',
      description: i18n.translate('monaco.esql.definitions.countDistinctDoc', {
        defaultMessage: 'Returns the count of distinct values in a field.',
      }),
      supportedCommands: ['stats'],
      signatures: [
        {
          params: [
            { name: 'column', type: 'any', noNestingFunctions: true },
            { name: 'precision', type: 'number', noNestingFunctions: true, optional: true },
          ],
          returnType: 'number',
          examples: [
            `from index | stats result = count_distinct(field)`,
            `from index | stats count_distinct(field)`,
          ],
        },
      ],
    },
    {
      name: 'st_centroid',
      type: 'agg',
      description: i18n.translate('monaco.esql.definitions.stCentroidDoc', {
        defaultMessage: 'Returns the count of distinct values in a field.',
      }),
      supportedCommands: ['stats'],
      signatures: [
        {
          params: [{ name: 'column', type: 'cartesian_point', noNestingFunctions: true }],
          returnType: 'cartesian_point',
          examples: [
            `from index | stats result = st_centroid(cartesian_field)`,
            `from index | stats st_centroid(cartesian_field)`,
          ],
        },
        {
          params: [{ name: 'column', type: 'geo_point', noNestingFunctions: true }],
          returnType: 'geo_point',
          examples: [
            `from index | stats result = st_centroid(geo_field)`,
            `from index | stats st_centroid(geo_field)`,
          ],
        },
      ],
    },
  ]);

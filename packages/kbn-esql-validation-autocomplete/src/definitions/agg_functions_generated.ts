/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { GeneratedFunctionDefinition } from './types';

export const generatedFunctions: GeneratedFunctionDefinition[] = [
  {
    type: 'agg',
    name: 'avg',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.avg', {
      defaultMessage: 'The average of a numeric field.',
    }),
    alias: undefined,
    signatures: [
      {
        params: [
          {
            name: 'number',
            type: 'number',
            optional: false,
          },
        ],
        returnType: 'number',
      },
    ],
  },
  {
    type: 'agg',
    name: 'count',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.count', {
      defaultMessage: 'Returns the total number (count) of input values.',
    }),
    alias: undefined,
    signatures: [
      {
        params: [
          {
            name: 'field',
            type: 'boolean',
            optional: true,
          },
        ],
        returnType: 'number',
      },
      {
        params: [
          {
            name: 'field',
            type: 'cartesian_point',
            optional: true,
          },
        ],
        returnType: 'number',
      },
      {
        params: [
          {
            name: 'field',
            type: 'date',
            optional: true,
          },
        ],
        returnType: 'number',
      },
      {
        params: [
          {
            name: 'field',
            type: 'number',
            optional: true,
          },
        ],
        returnType: 'number',
      },
      {
        params: [
          {
            name: 'field',
            type: 'geo_point',
            optional: true,
          },
        ],
        returnType: 'number',
      },
      {
        params: [
          {
            name: 'field',
            type: 'ip',
            optional: true,
          },
        ],
        returnType: 'number',
      },
      {
        params: [
          {
            name: 'field',
            type: 'string',
            optional: true,
          },
        ],
        returnType: 'number',
      },
      {
        params: [
          {
            name: 'field',
            type: 'version',
            optional: true,
          },
        ],
        returnType: 'number',
      },
    ],
  },
  {
    type: 'agg',
    name: 'count_distinct',
    description: i18n.translate(
      'kbn-esql-validation-autocomplete.esql.definitions.count_distinct',
      { defaultMessage: 'Returns the approximate number of distinct values.' }
    ),
    alias: undefined,
    signatures: [
      {
        params: [
          {
            name: 'field',
            type: 'boolean',
            optional: false,
          },
          {
            name: 'precision',
            type: 'number',
            optional: true,
          },
        ],
        returnType: 'number',
      },
      {
        params: [
          {
            name: 'field',
            type: 'cartesian_point',
            optional: false,
          },
          {
            name: 'precision',
            type: 'number',
            optional: true,
          },
        ],
        returnType: 'number',
      },
      {
        params: [
          {
            name: 'field',
            type: 'date',
            optional: false,
          },
          {
            name: 'precision',
            type: 'number',
            optional: true,
          },
        ],
        returnType: 'number',
      },
      {
        params: [
          {
            name: 'field',
            type: 'number',
            optional: false,
          },
          {
            name: 'precision',
            type: 'number',
            optional: true,
          },
        ],
        returnType: 'number',
      },
      {
        params: [
          {
            name: 'field',
            type: 'geo_point',
            optional: false,
          },
          {
            name: 'precision',
            type: 'number',
            optional: true,
          },
        ],
        returnType: 'number',
      },
      {
        params: [
          {
            name: 'field',
            type: 'ip',
            optional: false,
          },
          {
            name: 'precision',
            type: 'number',
            optional: true,
          },
        ],
        returnType: 'number',
      },
      {
        params: [
          {
            name: 'field',
            type: 'string',
            optional: false,
          },
          {
            name: 'precision',
            type: 'number',
            optional: true,
          },
        ],
        returnType: 'number',
      },
      {
        params: [
          {
            name: 'field',
            type: 'version',
            optional: false,
          },
          {
            name: 'precision',
            type: 'number',
            optional: true,
          },
        ],
        returnType: 'number',
      },
    ],
  },
  {
    type: 'agg',
    name: 'max',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.max', {
      defaultMessage: 'The maximum value of a numeric field.',
    }),
    alias: undefined,
    signatures: [
      {
        params: [
          {
            name: 'number',
            type: 'number',
            optional: false,
          },
        ],
        returnType: 'number',
      },
    ],
  },
  {
    type: 'agg',
    name: 'median',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.median', {
      defaultMessage:
        'The value that is greater than half of all values and less than half of all values.',
    }),
    alias: undefined,
    signatures: [
      {
        params: [
          {
            name: 'number',
            type: 'number',
            optional: false,
          },
        ],
        returnType: 'number',
      },
    ],
  },
  {
    type: 'agg',
    name: 'median_absolute_deviation',
    description: i18n.translate(
      'kbn-esql-validation-autocomplete.esql.definitions.median_absolute_deviation',
      { defaultMessage: 'The median absolute deviation, a measure of variability.' }
    ),
    alias: undefined,
    signatures: [
      {
        params: [
          {
            name: 'number',
            type: 'number',
            optional: false,
          },
        ],
        returnType: 'number',
      },
    ],
  },
  {
    type: 'agg',
    name: 'min',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.min', {
      defaultMessage: 'The minimum value of a numeric field.',
    }),
    alias: undefined,
    signatures: [
      {
        params: [
          {
            name: 'number',
            type: 'number',
            optional: false,
          },
        ],
        returnType: 'number',
      },
    ],
  },
  {
    type: 'agg',
    name: 'percentile',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.percentile', {
      defaultMessage: 'The value at which a certain percentage of observed values occur.',
    }),
    alias: undefined,
    signatures: [
      {
        params: [
          {
            name: 'number',
            type: 'number',
            optional: false,
          },
          {
            name: 'percentile',
            type: 'number',
            optional: false,
          },
        ],
        returnType: 'number',
      },
    ],
  },
  {
    type: 'agg',
    name: 'st_centroid',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.st_centroid', {
      defaultMessage: 'The centroid of a spatial field.',
    }),
    alias: undefined,
    signatures: [
      {
        params: [
          {
            name: 'field',
            type: 'geo_point',
            optional: false,
          },
        ],
        returnType: 'any',
      },
      {
        params: [
          {
            name: 'field',
            type: 'cartesian_point',
            optional: false,
          },
        ],
        returnType: 'any',
      },
    ],
  },
  {
    type: 'agg',
    name: 'sum',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.sum', {
      defaultMessage: 'The sum of a numeric field.',
    }),
    alias: undefined,
    signatures: [
      {
        params: [
          {
            name: 'number',
            type: 'number',
            optional: false,
          },
        ],
        returnType: 'number',
      },
    ],
  },
  {
    type: 'agg',
    name: 'values',
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.values', {
      defaultMessage: 'Collect values for a field.',
    }),
    alias: undefined,
    signatures: [
      {
        params: [
          {
            name: 'field',
            type: 'boolean',
            optional: false,
          },
        ],
        returnType: 'any',
      },
      {
        params: [
          {
            name: 'field',
            type: 'date',
            optional: false,
          },
        ],
        returnType: 'any',
      },
      {
        params: [
          {
            name: 'field',
            type: 'number',
            optional: false,
          },
        ],
        returnType: 'any',
      },
      {
        params: [
          {
            name: 'field',
            type: 'ip',
            optional: false,
          },
        ],
        returnType: 'any',
      },
      {
        params: [
          {
            name: 'field',
            type: 'string',
            optional: false,
          },
        ],
        returnType: 'any',
      },
      {
        params: [
          {
            name: 'field',
            type: 'version',
            optional: false,
          },
        ],
        returnType: 'any',
      },
    ],
  },
];

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { FunctionDefinition } from './types';

export const groupingFunctionDefinitions: FunctionDefinition[] = [
  {
    name: 'bucket',
    alias: ['bin'],
    description: i18n.translate('kbn-esql-validation-autocomplete.esql.definitions.autoBucketDoc', {
      defaultMessage: `Automatically bucket dates based on a given range and bucket target.`,
    }),
    // type agg because it can also be used as an aggregation...
    type: 'agg',
    supportedCommands: ['stats'],
    supportedOptions: ['by'],
    signatures: [
      {
        params: [
          { name: 'field', type: 'datetime' },
          { name: 'buckets', type: 'time_literal', constantOnly: true },
        ],
        returnType: 'datetime',
      },
      {
        params: [
          { name: 'field', type: 'integer' },
          { name: 'buckets', type: 'integer', constantOnly: true },
        ],
        returnType: 'integer',
      },
      {
        params: [
          // @TODO: check for support for date_period, 'keyword',
          { name: 'field', type: 'datetime' },
          { name: 'buckets', type: 'integer', constantOnly: true },
          { name: 'startDate', type: 'text', constantOnly: true },
          { name: 'endDate', type: 'text', constantOnly: true },
        ],
        returnType: 'datetime',
      },
      {
        params: [
          // @TODO: check for support for date_period
          { name: 'field', type: 'datetime' },
          { name: 'buckets', type: 'integer', constantOnly: true },
          { name: 'startDate', type: 'datetime', constantOnly: true },
          { name: 'endDate', type: 'datetime', constantOnly: true },
        ],
        returnType: 'datetime',
      },
      {
        params: [
          // @TODO: check for support for date_period
          { name: 'field', type: 'datetime' },
          { name: 'buckets', type: 'integer', constantOnly: true },
          { name: 'startDate', type: 'string', constantOnly: true },
          { name: 'endDate', type: 'datetime', constantOnly: true },
        ],
        returnType: 'datetime',
      },
      {
        params: [
          // @TODO: check for support for date_period
          { name: 'field', type: 'datetime' },
          { name: 'buckets', type: 'integer', constantOnly: true },
          { name: 'startDate', type: 'datetime', constantOnly: true },
          { name: 'endDate', type: 'string', constantOnly: true },
        ],
        returnType: 'datetime',
      },
      {
        params: [
          { name: 'field', type: 'integer' },
          { name: 'buckets', type: 'integer', constantOnly: true },
          { name: 'startValue', type: 'integer', constantOnly: true },
          { name: 'endValue', type: 'integer', constantOnly: true },
        ],
        returnType: 'integer',
      },
    ],
    examples: [
      'from index | eval hd = bucket(bytes, 1 hour)',
      'from index | eval hd = bucket(hire_date, 1 hour)',
      'from index | eval hd = bucket(hire_date, 20, "1985-01-01T00:00:00Z", "1986-01-01T00:00:00Z")',
      'from index | eval hd = bucket(hire_date, 20, "1985-01-01T00:00:00Z", "1986-01-01T00:00:00Z")',
      'from index | eval bs = bucket(bytes, 20, 25324, 74999)',
    ],
  },
];

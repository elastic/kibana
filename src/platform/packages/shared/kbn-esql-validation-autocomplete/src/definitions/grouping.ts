/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { FunctionDefinition, FunctionParameterType, FunctionReturnType } from './types';

const groupingTypeTable: Array<
  [
    FunctionParameterType,
    FunctionParameterType,
    FunctionParameterType | null,
    FunctionParameterType | null,
    FunctionReturnType
  ]
> = [
  // field   // bucket   //from    // to   //result
  ['date', 'date_period', null, null, 'date'],
  ['date', 'integer', 'date', 'date', 'date'],
  // Modified time_duration to time_literal
  ['date', 'time_literal', null, null, 'date'],
  ['double', 'double', null, null, 'double'],
  ['double', 'integer', 'double', 'double', 'double'],
  ['double', 'integer', 'double', 'integer', 'double'],
  ['double', 'integer', 'double', 'long', 'double'],
  ['double', 'integer', 'integer', 'double', 'double'],
  ['double', 'integer', 'integer', 'integer', 'double'],
  ['double', 'integer', 'integer', 'long', 'double'],
  ['double', 'integer', 'long', 'double', 'double'],
  ['double', 'integer', 'long', 'integer', 'double'],
  ['double', 'integer', 'long', 'long', 'double'],
  ['integer', 'double', null, null, 'double'],
  ['integer', 'integer', 'double', 'double', 'double'],
  ['integer', 'integer', 'double', 'integer', 'double'],
  ['integer', 'integer', 'double', 'long', 'double'],
  ['integer', 'integer', 'integer', 'double', 'double'],
  ['integer', 'integer', 'integer', 'integer', 'double'],
  ['integer', 'integer', 'integer', 'long', 'double'],
  ['integer', 'integer', 'long', 'double', 'double'],
  ['integer', 'integer', 'long', 'integer', 'double'],
  ['integer', 'integer', 'long', 'long', 'double'],
  ['long', 'double', null, null, 'double'],
  ['long', 'integer', 'double', 'double', 'double'],
  ['long', 'integer', 'double', 'integer', 'double'],
  ['long', 'integer', 'double', 'long', 'double'],
  ['long', 'integer', 'integer', 'double', 'double'],
  ['long', 'integer', 'integer', 'integer', 'double'],
  ['long', 'integer', 'integer', 'long', 'double'],
  ['long', 'integer', 'long', 'double', 'double'],
  ['long', 'integer', 'long', 'integer', 'double'],
  ['long', 'integer', 'long', 'long', 'double'],
];
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
      ...groupingTypeTable.map((signature) => {
        const [fieldType, bucketType, fromType, toType, resultType] = signature;
        return {
          params: [
            { name: 'field', type: fieldType },
            { name: 'buckets', type: bucketType, constantOnly: true },
            ...(fromType ? [{ name: 'startDate', type: fromType, constantOnly: true }] : []),
            ...(toType ? [{ name: 'endDate', type: toType, constantOnly: true }] : []),
          ],
          returnType: resultType,
        };
      }),
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { camelCase } from 'lodash';
import { supportedFieldTypes } from '../definitions/types';

export const fields = [
  ...supportedFieldTypes.map((type) => ({ name: `${camelCase(type)}Field`, type })),
  { name: 'any#Char$Field', type: 'number' },
  { name: 'kubernetes.something.something', type: 'number' },
  { name: '@timestamp', type: 'date' },
];

export const enrichFields = [
  { name: 'otherField', type: 'string' },
  { name: 'yetAnotherField', type: 'number' },
];

// eslint-disable-next-line @typescript-eslint/naming-convention
export const unsupported_field = [{ name: 'unsupported_field', type: 'unsupported' }];

export const indexes = [
  'a_index',
  'index',
  'other_index',
  '.secret_index',
  'my-index',
  'unsupported_index',
];

export const policies = [
  {
    name: 'policy',
    sourceIndices: ['enrich_index'],
    matchField: 'otherStringField',
    enrichFields: ['otherField', 'yetAnotherField'],
  },
  {
    name: 'policy$',
    sourceIndices: ['enrich_index'],
    matchField: 'otherStringField',
    enrichFields: ['otherField', 'yetAnotherField'],
  },
];

export function getCallbackMocks() {
  return {
    getFieldsFor: jest.fn(async ({ query }) => {
      if (/enrich/.test(query)) {
        return enrichFields;
      }
      if (/unsupported_index/.test(query)) {
        return unsupported_field;
      }
      if (/dissect|grok/.test(query)) {
        return [{ name: 'firstWord', type: 'string' }];
      }
      return fields;
    }),
    getSources: jest.fn(async () =>
      indexes.map((name) => ({
        name,
        hidden: name.startsWith('.'),
      }))
    ),
    getPolicies: jest.fn(async () => policies),
  };
}

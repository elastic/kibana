/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { camelCase } from 'lodash';
import { ESQLRealField, JoinIndexAutocompleteItem } from '../validation/types';
import { fieldTypes } from '../definitions/types';
import { ESQLCallbacks } from '../shared/types';

export const fields: ESQLRealField[] = [
  ...fieldTypes.map((type) => ({ name: `${camelCase(type)}Field`, type })),
  { name: 'any#Char$Field', type: 'double' },
  { name: 'kubernetes.something.something', type: 'double' },
  { name: '@timestamp', type: 'date' },
];

export const enrichFields: ESQLRealField[] = [
  { name: 'otherField', type: 'text' },
  { name: 'yetAnotherField', type: 'double' },
];

// eslint-disable-next-line @typescript-eslint/naming-convention
export const unsupported_field: ESQLRealField[] = [
  { name: 'unsupported_field', type: 'unsupported' },
];

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

export const joinIndices: JoinIndexAutocompleteItem[] = [
  {
    name: 'join_index',
    mode: 'lookup',
    aliases: [],
  },
  {
    name: 'join_index_with_alias',
    mode: 'lookup',
    aliases: ['join_index_alias_1', 'join_index_alias_2'],
  },
];

export function getCallbackMocks(): ESQLCallbacks {
  return {
    getColumnsFor: jest.fn(async ({ query } = {}) => {
      if (/enrich/.test(query)) {
        return enrichFields;
      }
      if (/unsupported_index/.test(query)) {
        return unsupported_field;
      }
      if (/dissect|grok/.test(query)) {
        const field: ESQLRealField = { name: 'firstWord', type: 'text' };
        return [field];
      }
      return fields;
    }),
    getSources: jest.fn(async () =>
      indexes.map((name) => ({
        name,
        hidden: name.startsWith('.'),
        type: 'Index',
      }))
    ),
    getPolicies: jest.fn(async () => policies),
    getJoinIndices: jest.fn(async () => ({ indices: joinIndices })),
  };
}

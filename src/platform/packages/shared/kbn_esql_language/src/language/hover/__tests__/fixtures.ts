/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLFieldWithMetadata, EsqlFieldType } from '@kbn/esql-types';

const types: EsqlFieldType[] = ['keyword', 'double', 'date', 'boolean', 'ip'];

const fields: Array<ESQLFieldWithMetadata & { suggestedAs?: string }> = [
  ...types.map((type) => ({
    name: `${type}Field`,
    type,
    userDefined: false as false,
  })),
  { name: 'any#Char$Field', type: 'double', suggestedAs: '`any#Char$Field`', userDefined: false },
  { name: 'kubernetes.something.something', type: 'double', userDefined: false },
];

const indexes = (
  [] as Array<{ name: string; hidden: boolean; suggestedAs: string | undefined }>
).concat(
  ['a', 'index', 'otherIndex', '.secretIndex', 'my-index'].map((name) => ({
    name,
    hidden: name.startsWith('.'),
    suggestedAs: undefined,
  })),
  ['my-index[quoted]', 'my-index$', 'my_index{}'].map((name) => ({
    name,
    hidden: false,
    suggestedAs: `\`${name}\``,
  }))
);

export const policies = [
  {
    name: 'policy',
    sourceIndices: ['enrichIndex1'],
    matchField: 'otherStringField',
    enrichFields: ['otherField', 'yetAnotherField', 'yet-special-field'],
    suggestedAs: undefined,
  },
  ...['my-policy[quoted]', 'my-policy$', 'my_policy{}'].map((name) => ({
    name,
    sourceIndices: ['enrichIndex1'],
    matchField: 'otherStringField',
    enrichFields: ['otherField', 'yetAnotherField', 'yet-special-field'],
    suggestedAs: `\`${name}\``,
  })),
];

function createCustomCallbackMocks() {
  return {
    getSources: jest.fn(async () => indexes),
    getPolicies: jest.fn(async () => policies),
    getColumnsFor: jest.fn(async () => fields),
  };
}

export const setupTestbed = (statement: string, triggerString: string) => {
  const callbacks = createCustomCallbackMocks();
  const testbed = {
    callbacks,
    offset: statement.lastIndexOf(triggerString),
  };

  return testbed;
};

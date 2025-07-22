/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLFieldWithMetadata } from '@kbn/esql-ast/src/commands_registry/types';
import { FieldType } from '@kbn/esql-ast';
import { monaco } from '../../../../../monaco_imports';
import { HoverMonacoModel } from '../hover';

const types: FieldType[] = ['keyword', 'double', 'date', 'boolean', 'ip'];

const fields: Array<ESQLFieldWithMetadata & { suggestedAs?: string }> = [
  ...types.map((type) => ({
    name: `${type}Field`,
    type,
  })),
  { name: 'any#Char$Field', type: 'double', suggestedAs: '`any#Char$Field`' },
  { name: 'kubernetes.something.something', type: 'double' },
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
    getFieldsFor: jest.fn(async () => fields),
    getSources: jest.fn(async () => indexes),
    getPolicies: jest.fn(async () => policies),
  };
}

function createModelAndPosition(text: string, string: string) {
  return {
    model: {
      getValue: () => text,
    } as HoverMonacoModel,
    position: { lineNumber: 1, column: text.lastIndexOf(string) + 1 } as monaco.Position,
  };
}

export const setupTestbed = (statement: string, triggerString: string) => {
  const { model, position } = createModelAndPosition(statement, triggerString);
  const callbacks = createCustomCallbackMocks();
  const testbed = {
    model,
    position,
    callbacks,
  };

  return testbed;
};

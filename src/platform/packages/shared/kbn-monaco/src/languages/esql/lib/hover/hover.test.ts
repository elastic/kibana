/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ESQLFieldWithMetadata,
  getFunctionDefinition,
  getFunctionSignatures,
} from '@kbn/esql-validation-autocomplete';
import { modeDescription } from '@kbn/esql-validation-autocomplete/src/autocomplete/commands/enrich/util';
import { ENRICH_MODES } from '@kbn/esql-validation-autocomplete/src/definitions/commands_helpers';
import { FieldType } from '@kbn/esql-validation-autocomplete/src/definitions/types';
import { monaco } from '../../../../monaco_imports';
import { getHoverItem, HoverMonacoModel } from './hover';

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
const policies = [
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

const setupTestbed = (statement: string, triggerString: string) => {
  const { model, position } = createModelAndPosition(statement, triggerString);
  const callbacks = createCustomCallbackMocks();
  const testbed = {
    model,
    position,
    callbacks,
  };

  return testbed;
};

const assertGetHoverItem = async (statement: string, triggerString: string, expected: string[]) => {
  const kit = setupTestbed(statement, triggerString);
  const { contents } = await getHoverItem(kit.model, kit.position, kit.callbacks);
  const result = contents.map(({ value }) => value).sort();

  expect(result).toEqual(expected.sort());
};

describe('getHoverItem()', () => {
  describe('policies', () => {
    test('returns enrich policy list on hover', async () => {
      function createPolicyContent(
        policyName: string,
        customPolicies: Array<(typeof policies)[number]> = policies
      ) {
        const policyHit = customPolicies.find((p) => p.name === policyName);
        if (!policyHit) {
          return [];
        }
        return [
          `**Indexes**: ${policyHit.sourceIndices.join(', ')}`,
          `**Matching field**: ${policyHit.matchField}`,
          `**Fields**: ${policyHit.enrichFields.join(', ')}`,
        ];
      }

      await assertGetHoverItem(
        `from a | enrich policy on b with var0 = stringField`,
        'policy',
        createPolicyContent('policy')
      );
      await assertGetHoverItem(`from a | enrich policy`, 'policy', createPolicyContent('policy'));
      await assertGetHoverItem(
        `from a | enrich policy on b `,
        'policy',
        createPolicyContent('policy')
      );
      await assertGetHoverItem(`from a | enrich policy on b `, 'non-policy', []);
    });

    describe('ccq mode', () => {
      for (const mode of ENRICH_MODES) {
        test(mode.name, async () => {
          await assertGetHoverItem(`from a | enrich _${mode.name}:policy`, `_${mode.name}`, [
            modeDescription,
            `**${mode.name}**: ${mode.description}`,
          ]);
        });
      }
    });
  });

  describe('functions', () => {
    function createFunctionContent(fn: string) {
      const fnDefinition = getFunctionDefinition(fn);
      if (!fnDefinition) {
        return [];
      }
      return [getFunctionSignatures(fnDefinition)[0].declaration, fnDefinition.description];
    }

    test('function name', async () => {
      await assertGetHoverItem(
        `from a | eval round(numberField)`,
        'round',
        createFunctionContent('round')
      );
      await assertGetHoverItem(
        `from a | eval nonExistentFn(numberField)`,
        'nonExistentFn',
        createFunctionContent('nonExistentFn')
      );
      await assertGetHoverItem(
        `from a | eval round(numberField)`,
        'round',
        createFunctionContent('round')
      );
      await assertGetHoverItem(
        `from a | eval nonExistentFn(numberField)`,
        'nonExistentFn',
        createFunctionContent('nonExistentFn')
      );
    });

    test('nested function name', async () => {
      await assertGetHoverItem(`from a | stats avg(round(numberField))`, 'round', [
        '**Acceptable types**: **double** | **integer** | **long**',
        ...createFunctionContent('round'),
      ]);
      await assertGetHoverItem(`from a | stats avg(nonExistentFn(numberField))`, 'nonExistentFn', [
        '**Acceptable types**: **double** | **integer** | **long**',
        ...createFunctionContent('nonExistentFn'),
      ]);
    });
  });
});

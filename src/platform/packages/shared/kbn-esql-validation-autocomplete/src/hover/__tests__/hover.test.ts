/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { getFunctionSignatures, getFunctionDefinition } from '@kbn/esql-ast/src/definitions/utils';
import {
  modeDescription,
  ENRICH_MODES,
} from '@kbn/esql-ast/src/commands_registry/commands/enrich/util';
import { getHoverItem } from '..';
import { policies, setupTestbed } from './fixtures';

const assertGetHoverItem = async (statement: string, triggerString: string, expected: string[]) => {
  const kit = setupTestbed(statement, triggerString);
  const { contents } = await getHoverItem(statement, kit.offset, kit.callbacks);
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

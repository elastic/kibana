/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { getFunctionDefinition } from '../../../commands/definitions/utils';
import { modeDescription, ENRICH_MODES } from '../../../commands/registry/enrich/util';
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
    test('function name', async () => {
      await assertGetHoverItem(`from a | eval round(numberField)`, 'round', [
        getFunctionDefinition('round')!.description,
        `\`\`\`none
ROUND(
  number:double|integer|long|unsigned_long,  
  decimals?:integer|long
): double|integer|long|unsigned_long
\`\`\``,
      ]);
      await assertGetHoverItem(`from a | eval round(numberField,)`, 'round', [
        getFunctionDefinition('round')!.description,
        `\`\`\`none
ROUND(
  number:double|integer|long|unsigned_long,  
  decimals?:integer|long
): double|integer|long|unsigned_long
\`\`\``,
      ]);
      await assertGetHoverItem(`from a | eval round(numberField, )`, 'round', [
        getFunctionDefinition('round')!.description,
        `\`\`\`none
ROUND(
  number:double|integer|long|unsigned_long,  
  decimals?:integer|long
): double|integer|long|unsigned_long
\`\`\``,
      ]);
      await assertGetHoverItem(`from a | eval nonExistentFn(numberField)`, 'nonExistentFn', []);
      await assertGetHoverItem(`from a | eval round(numberField)`, 'round', [
        getFunctionDefinition('round')!.description,
        `\`\`\`none
ROUND(
  number:double|integer|long|unsigned_long,  
  decimals?:integer|long
): double|integer|long|unsigned_long
\`\`\``,
      ]);
      await assertGetHoverItem(`from a | eval nonExistentFn(numberField)`, 'nonExistentFn', []);
    });

    test('nested function name', async () => {
      await assertGetHoverItem(`from a | stats avg(round(numberField))`, 'round', [
        getFunctionDefinition('round')!.description,
        `\`\`\`none
ROUND(
  number:double|integer|long|unsigned_long,  
  decimals?:integer|long
): double|integer|long|unsigned_long
\`\`\``,
      ]);
      await assertGetHoverItem(
        `from a | stats avg(nonExistentFn(numberField))`,
        'nonExistentFn',
        []
      );
    });
  });

  describe('columns', () => {
    test('column name type is displayed on hover', async () => {
      await assertGetHoverItem(`from a | eval newField = doubleField + 10`, 'doubleField', [
        '**doubleField**: double',
      ]);
    });

    test('column name type is displayed on hover for columns inside functions', async () => {
      await assertGetHoverItem(`from a | eval newField = max(doubleField)`, 'doubleField', [
        '**doubleField**: double',
      ]);
    });

    test('no hover info for non-existent fields in expressions', async () => {
      await assertGetHoverItem(
        `from a | eval newField = nonExistentField + 10`,
        'nonExistentField',
        []
      );
    });
  });
});

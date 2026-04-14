/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { getFunctionDefinition } from '../../../commands/definitions/utils';
import { getPromqlFunctionDefinition } from '../../../commands/definitions/utils/promql';

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

describe('PromQL functions', () => {
  test('hover on PromQL function name', async () => {
    await assertGetHoverItem('PROMQL step="5m" rate(http_requests[5m])', 'rate', [
      getPromqlFunctionDefinition('rate')!.description,
      `\`\`\`none
rate(v: range_vector) → instant_vector
\`\`\``,
    ]);
  });

  test('hover on nested PromQL function', async () => {
    await assertGetHoverItem('PROMQL step="5m" sum(rate(http_requests[5m]))', 'rate', [
      getPromqlFunctionDefinition('rate')!.description,
      `\`\`\`none
rate(v: range_vector) → instant_vector
\`\`\``,
    ]);
  });
});

describe('PromQL selectors', () => {
  test('hover on metric shows instant vector when no duration', async () => {
    await assertGetHoverItem('PROMQL step="5m" avg(bytes + 10)', 'bytes', [
      '**bytes**: instant vector',
    ]);
  });

  test('hover on metric shows range vector when duration present', async () => {
    await assertGetHoverItem('PROMQL step="5m" rate(http_requests[5m])', 'http_requests', [
      '**http_requests**: range vector',
    ]);
  });
});

describe('PromQL literals', () => {
  test('hover on numeric literal shows scalar', async () => {
    await assertGetHoverItem('PROMQL step="5m" quantile(0.9, bytes)', '0.9', ['**0.9**: scalar']);
  });

  test('hover on duration literal shows duration', async () => {
    await assertGetHoverItem('PROMQL step="5m" rate(http_requests[5m])', '5m]', [
      '**5m**: duration',
    ]);
  });
});

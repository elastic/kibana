/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { camelCase } from 'lodash';
import { getFieldNamesByType, getPolicyFields, policies, setup } from './helpers';

describe('autocomplete.suggest', () => {
  describe('ENRICH', () => {
    const modes = ['any', 'coordinator', 'remote'];
    const expectedPolicyNameSuggestions = policies
      .map(({ name, suggestedAs }) => suggestedAs || name)
      .map((name) => `${name} `);

    it('suggests policy names', async () => {
      const { assertSuggestions } = await setup();
      await assertSuggestions(`from a | enrich /`, expectedPolicyNameSuggestions);
    });

    test('modes', async () => {
      const { assertSuggestions } = await setup();
      await assertSuggestions(
        `from a | enrich _/`,
        modes.map((mode) => `_${mode}:$0`),
        { triggerCharacter: '_' }
      );
      await assertSuggestions('from a | enrich _any: /', []);
      for (const mode of modes) {
        await assertSuggestions(`from a | enrich _${mode}:/`, expectedPolicyNameSuggestions, {
          triggerCharacter: ':',
        });

        await assertSuggestions(
          `from a | enrich _${mode.toUpperCase()}:/`,
          expectedPolicyNameSuggestions,
          { triggerCharacter: ':' }
        );

        await assertSuggestions(
          `from a | enrich _${camelCase(mode)}:/`,
          expectedPolicyNameSuggestions,
          { triggerCharacter: ':' }
        );
      }
    });

    it('suggests ON and WITH after policy name', async () => {
      const { assertSuggestions } = await setup();
      await assertSuggestions(`from a | enrich policy /`, ['ON ', 'WITH ', '| ']);
    });

    it('suggests fields after ON', async () => {
      const { assertSuggestions } = await setup();
      await assertSuggestions(
        `from a | enrich policy on /`,
        getFieldNamesByType('any').map((v) => `${v} `)
      );
    });

    it('suggests WITH after ON <field>', async () => {
      const { assertSuggestions } = await setup();
      await assertSuggestions(`from a | enrich policy on field /`, ['WITH ', '| ']);
    });

    it('suggests fields after WITH', async () => {
      const { assertSuggestions } = await setup();
      await assertSuggestions(`from a | enrich policy on field with /`, [
        'var0 = ',
        ...getPolicyFields('policy'),
      ]);
      await assertSuggestions(`from a | enrich policy on b with var0 /`, ['= $0', ',', '| ']);
      await assertSuggestions(`from a | enrich policy on b with var0 = /`, [
        ...getPolicyFields('policy'),
      ]);
      await assertSuggestions(`from a | enrich policy on b with var0 = keywordField /`, [
        ',',
        '| ',
      ]);
      await assertSuggestions(`from a | enrich policy on b with var0 = keywordField, /`, [
        'var1 = ',
        ...getPolicyFields('policy'),
      ]);
      await assertSuggestions(`from a | enrich policy on b with var0 = keywordField, var1 /`, [
        '= $0',
        ',',
        '| ',
      ]);
      await assertSuggestions(`from a | enrich policy on b with var0 = keywordField, var1 = /`, [
        ...getPolicyFields('policy'),
      ]);
      await assertSuggestions(
        `from a | enrich policy with /`,
        ['var0 = ', ...getPolicyFields('policy')],
        { triggerCharacter: ' ' }
      );
    });

    test('suggestions after a <field>', async () => {
      const { assertSuggestions } = await setup();
      await assertSuggestions(`from a | enrich policy with keywordField /`, ['= $0', ',', '| ']);
    });
  });
});

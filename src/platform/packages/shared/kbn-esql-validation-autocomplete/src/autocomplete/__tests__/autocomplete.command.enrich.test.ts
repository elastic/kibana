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

    let assertSuggestions: Awaited<ReturnType<typeof setup>>['assertSuggestions'];
    beforeEach(async () => {
      const setupResult = await setup();
      assertSuggestions = setupResult.assertSuggestions;
    });

    it('suggests policy names', async () => {
      await assertSuggestions(`from a | enrich /`, expectedPolicyNameSuggestions);
    });

    test('modes', async () => {
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
      await assertSuggestions(`from a | enrich policy /`, ['ON ', 'WITH ', '| ']);
    });

    it('suggests fields after ON', async () => {
      await assertSuggestions(
        `from a | enrich policy on /`,
        getFieldNamesByType('any').map((v) => `${v} `)
      );
    });

    it('suggests WITH after ON <field>', async () => {
      await assertSuggestions(`from a | enrich policy on field /`, ['WITH ', '| ']);
    });

    it('suggests fields for new clauses', async () => {
      await assertSuggestions(`from a | enrich policy on field with /`, [
        'var0 = ',
        ...getPolicyFields('policy'),
      ]);
      await assertSuggestions(`from a | enrich policy on b with var0 = keywordField, /`, [
        'var1 = ',
        ...getPolicyFields('policy'),
      ]);
    });
    test('after first word', async () => {
      await assertSuggestions(`from a | enrich policy on b with var0 /`, ['= $0']);
      await assertSuggestions(`from a | enrich policy on b with keywordField /`, [',', '| ']);
    });

    test('after open assignment', async () => {
      await assertSuggestions(`from a | enrich policy on b with var0 = /`, [
        ...getPolicyFields('policy'),
      ]);
      await assertSuggestions(`from a | enrich policy on b with var0 = keywordField, var1 =  /`, [
        ...getPolicyFields('policy'),
      ]);
    });

    test('after complete clause', async () => {
      await assertSuggestions(`from a | enrich policy on b with var0 = keywordField /`, [
        ',',
        '| ',
      ]);
      await assertSuggestions(`from a | enrich policy on b with var0=keywordField /`, [',', '| ']);
      await assertSuggestions(`from a | enrich policy on b with keywordField /`, [',', '| ']);
    });

    test('after user-defined column name', async () => {
      await assertSuggestions(`from a | enrich policy on b with var0 = keywordField, var1 /`, [
        '= $0',
      ]);
    });
  });
});

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
      await assertSuggestions(`from a | enrich po/`, expectedPolicyNameSuggestions);
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
      await assertSuggestions(`from a | enrich policy O/`, ['ON ', 'WITH ', '| ']);
    });

    it('suggests fields after ON', async () => {
      await assertSuggestions(
        `from a | enrich policy on /`,
        getFieldNamesByType('any').map((v) => `${v} `)
      );
      await assertSuggestions(
        `from a | enrich policy on fi/`,
        getFieldNamesByType('any').map((v) => `${v} `)
      );
    });

    describe('WITH', () => {
      it('suggests WITH after ON <field>', async () => {
        await assertSuggestions(`from a | enrich policy on field /`, ['WITH ', '| ']);
      });

      it('suggests fields for new WITH clauses', async () => {
        await assertSuggestions(`from a | enrich policy on field with /`, [
          'col0 = ',
          ...getPolicyFields('policy').map((name) => ({
            text: name,
            // Makes sure the suggestion menu isn't opened when a field is accepted
            command: undefined,
          })),
        ]);
        await assertSuggestions(`from a | enrich policy on field with fi/`, [
          'col0 = ',
          ...getPolicyFields('policy'),
        ]);
        await assertSuggestions(`from a | enrich policy on b with col0 = otherField, /`, [
          'col1 = ',
          ...getPolicyFields('policy'),
        ]);
        await assertSuggestions(`from a | enrich policy on b with col0 = otherField, fi/`, [
          'col1 = ',
          ...getPolicyFields('policy'),
        ]);
      });

      test('waits to suggest fields until space', async () => {
        await assertSuggestions(`from a | enrich policy on b with col0 = otherField,/`, []);
        await assertSuggestions(`from a | enrich policy on b with/`, []);
      });

      test('after first word', async () => {
        // not a recognized column name
        await assertSuggestions(`from a | enrich policy on b with col0 /`, ['= $0']);
        // recognized column name
        await assertSuggestions(`from a | enrich policy on b with otherField /`, [',', '| ']);
      });

      test('suggests enrich fields after open assignment', async () => {
        await assertSuggestions(`from a | enrich policy on b with col0 = /`, [
          ...getPolicyFields('policy'),
        ]);
        await assertSuggestions(`from a | enrich policy on b with col0 = fi/`, [
          ...getPolicyFields('policy'),
        ]);
        await assertSuggestions(`from a | enrich policy on b with col0 = otherField, col1 =  /`, [
          ...getPolicyFields('policy'),
        ]);
      });

      test('after complete clause', async () => {
        // works with escaped field names
        await assertSuggestions(`from a | enrich policy on b with col0 = \`otherField\` /`, [
          ',',
          '| ',
        ]);
        await assertSuggestions(`from a | enrich policy on b with col0=otherField /`, [',', '| ']);
        await assertSuggestions(`from a | enrich policy on b with otherField /`, [',', '| ']);
      });

      test('after user-defined column name', async () => {
        await assertSuggestions(`from a | enrich policy on b with col0 = otherField, col1 /`, [
          '= $0',
        ]);
      });
    });
  });
});

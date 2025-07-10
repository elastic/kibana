/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { ESQL_NUMBER_TYPES } from '@kbn/esql-ast';
import { attachTriggerCommand, getFieldNamesByType, setup } from './helpers';

describe('autocomplete.suggest', () => {
  describe('CHANGE_POINT', () => {
    let assertSuggestions: Awaited<ReturnType<typeof setup>>['assertSuggestions'];

    beforeEach(async () => {
      const setupResult = await setup();
      assertSuggestions = setupResult.assertSuggestions;
    });

    it('suggests value columns of numeric types', async () => {
      await assertSuggestions(
        `from a | change_point /`,
        getFieldNamesByType(ESQL_NUMBER_TYPES).map((v) => `${v} `)
      );
    });

    it('suggests ON after value column', async () => {
      await assertSuggestions(
        `from a | change_point value /`,
        ['ON ', 'AS ', '| '].map(attachTriggerCommand)
      );
      await assertSuggestions(
        `from a | change_point value O/`,
        ['ON ', 'AS ', '| '].map(attachTriggerCommand)
      );
    });

    it('suggests fields after ON', async () => {
      await assertSuggestions(
        `from a | change_point value on /`,
        getFieldNamesByType('any').map((v) => `${v} `)
      );
      await assertSuggestions(
        `from a | change_point value on fi/`,
        getFieldNamesByType('any').map((v) => `${v} `)
      );
    });

    describe('AS', () => {
      it('suggests AS after ON <field>', async () => {
        await assertSuggestions(
          `from a | change_point value on field /`,
          ['AS ', '| '].map(attachTriggerCommand)
        );
      });

      it('suggests default field name for AS clauses with an empty ON', async () => {
        await assertSuggestions(`from a | change_point value as / `, ['changePointType, ']);

        await assertSuggestions(`from a | change_point value on field as changePointType,/`, [
          'pValue',
        ]);
      });

      it('suggests default field name for AS clauses', async () => {
        await assertSuggestions(`from a | change_point value on field as / `, [
          'changePointType, ',
        ]);

        await assertSuggestions(`from a | change_point value on field as changePointType,/`, [
          'pValue',
        ]);
      });

      it('suggests a default pValue column name', async () => {
        await assertSuggestions(`from a | change_point value on field as changePointType,pValu/`, [
          'pValue',
        ]);
      });

      it('suggests pipe after complete command', async () => {
        await assertSuggestions(
          `from a | change_point value on field as changePointType, pValue /`,
          ['| ']
        );
      });
    });
  });
});

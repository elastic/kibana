/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { setup, getFieldNamesByType } from './helpers';

describe('autocomplete.suggest', () => {
  describe('SORT ( <column> [ ASC / DESC ] [ NULLS FIST / NULLS LAST ] )+', () => {
    describe('SORT <column> ...', () => {
      test('suggests command on first character', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('from a | sort /', [...getFieldNamesByType('any')]);
        await assertSuggestions('from a | sort column, /', [...getFieldNamesByType('any')]);
      });
    });

    describe('... [ ASC / DESC ] ...', () => {
      test('suggests command on first character', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('from a | sort stringField /', [
          'ASC',
          'DESC',
          'NULLS FIRST',
          'NULLS LAST',
          ',',
          '|',
        ]);
      });
    });

    describe('... [ NULLS FIST / NULLS LAST ]', () => {
      test('suggests command on first character', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('from a | sort stringField ASC /', [
          'NULLS FIRST',
          'NULLS LAST',
          ',',
          '|',
        ]);
      });
    });
  });
});

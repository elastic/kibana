/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { setup, getFieldNamesByType } from './helpers';

// describe('sort', () => {
//   testSuggestions('from a | sort ', [
//     ...getFieldNamesByType('any'),
//     ...getFunctionSignaturesByReturnType('sort', 'any', { scalar: true }),
//   ]);
//   testSuggestions('from a | sort stringField ', ['ASC', 'DESC', ',', '|']);
//   testSuggestions('from a | sort stringField desc ', ['NULLS FIRST', 'NULLS LAST', ',', '|']);
//   // @TODO: improve here
//   // testSuggestions('from a | sort stringField desc ', ['first', 'last']);
// });

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
      test.only('suggests command on first character', async () => {
        const { assertSuggestions } = await setup();

        await assertSuggestions('from a | sort stringField /', ['ASC', 'DESC', ',', '|']);
      });
    });
  });
});

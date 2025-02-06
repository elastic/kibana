/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setup } from './helpers';

describe('multi-word prefixes', () => {
  const assertRangeAttached = async (query: string, prefix: string) => {
    const { suggest } = await setup();
    (await suggest(query)).forEach((suggestion) => {
      if (!suggestion.rangeToReplace) {
        throw Error('No range attached to suggestion');
      }
      expect(
        query.substring(suggestion.rangeToReplace?.start - 1, suggestion.rangeToReplace?.end - 1)
      ).toEqual(prefix);
    });
  };

  test('null predicates', async () => {
    await assertRangeAttached('FROM index | EVAL field IS /', 'IS ');
    await assertRangeAttached('FROM index | EVAL field IS N/', 'IS N');
    await assertRangeAttached('FROM index | EVAL field Is N/', 'Is N');
    await assertRangeAttached('FROM index | EVAL field Is not nu/', 'Is not nu');
  });

  it('null sorting clauses', async () => {
    await assertRangeAttached('FROM index | SORT field nulls /', 'nulls ');
    await assertRangeAttached('FROM index | SORT field nulls f/', 'nulls f');
    await assertRangeAttached('FROM index | SORT field nUlLs LaS/', 'nUlLs LaS');
  });
});

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
  const assertRangeAttached = async (query: string, prefix: string, triggerCharacter?: string) => {
    const { suggest } = await setup();
    (await suggest(query, { triggerCharacter })).forEach((suggestion) => {
      if (!suggestion.rangeToReplace) {
        throw Error('No range attached to suggestion');
      }
      expect(
        query.substring(suggestion.rangeToReplace?.start - 1, suggestion.rangeToReplace?.end - 1)
      ).toEqual(prefix);
    });
  };

  const assertRangeNotAttached = async (query: string) => {
    const { suggest } = await setup();
    (await suggest(query)).forEach((suggestion) => {
      if (suggestion.rangeToReplace) {
        throw Error('Range was attached to suggestion');
      }
    });
  };

  test('null predicates', async () => {
    await assertRangeAttached('FROM index | EVAL field IS/', 'IS');
    await assertRangeAttached('FROM index | EVAL field IS /', 'IS ');
    await assertRangeAttached('FROM index | EVAL field IS /', 'IS ', ' ');
    await assertRangeAttached('FROM index | EVAL field IS N/', 'IS N');
    await assertRangeAttached('FROM index | EVAL field Is N/', 'Is N');
    await assertRangeAttached('FROM index | EVAL field Is not nu/', 'Is not nu');

    await assertRangeNotAttached('FROM index | EVAL field I/');
    await assertRangeNotAttached('FROM index | EVAL field IS NI/');
    await assertRangeNotAttached('FROM index | EVAL field IN/');
  });

  it('null sorting clauses', async () => {
    await assertRangeAttached('FROM index | SORT field nulls/', 'nulls');
    await assertRangeAttached('FROM index | SORT field nulls /', 'nulls ', ' ');
    await assertRangeAttached('FROM index | SORT field nulls f/', 'nulls f');
    await assertRangeAttached('FROM index | SORT field nUlLs LaS/', 'nUlLs LaS');

    await assertRangeNotAttached('FROM index | SORT field NULLE/');
  });

  it('LOOKUP JOIN', async () => {
    await assertRangeAttached('FROM index | LOOKUP/', 'LOOKUP');
    await assertRangeAttached('FROM index | lookup /', 'lookup ');
    await assertRangeAttached('FROM index | lookup /', 'lookup ', ' ');
    await assertRangeAttached('FROM index | LOOKUP /', 'LOOKUP ');
    await assertRangeAttached('FROM index | LOOKUP J/', 'LOOKUP J');

    await assertRangeNotAttached('FROM index | L/');
    await assertRangeNotAttached('FROM index | LOOK/');
    await assertRangeNotAttached('FROM index | LA/');
  });
});

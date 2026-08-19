/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setup } from './helpers';
import { getCallbackMocks } from '../../../__tests__/language/helpers';

describe('autocomplete.suggest', () => {
  test('does not load fields when suggesting within a single  SHOW, ROW command', async () => {
    const { suggest } = await setup('?');
    const callbacks = getCallbackMocks();

    await suggest('sHoW ?', { callbacks });
    await suggest('row ? |', { callbacks });

    expect((callbacks.getColumnsFor as any).mock.calls.length).toBe(0);
  });

  describe('new line suggestion', () => {
    test('does not suggest "New line" when cursor is at the start of an empty line', async () => {
      const { suggest } = await setup();
      // caret is on the blank line after the newline
      const result = await suggest('FROM index | LIMIT 10\n/');
      expect(result.map((s) => s.text)).not.toContain('\n');
    });

    test('suggests "New line" when cursor is at the end of a non-empty line', async () => {
      const { suggest } = await setup();
      // caret after trailing space — triggers after_value position in LIMIT
      const result = await suggest('FROM index | LIMIT 10 /');
      expect(result.map((s) => s.text)).toContain('\n');
    });
  });
});

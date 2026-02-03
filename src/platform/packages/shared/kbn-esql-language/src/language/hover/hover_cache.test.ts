/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getHoverItem } from '.';
import { setupTestbed } from './__tests__/fixtures';
import { fromCache } from './hover_cache';

describe('getHoverItem() caching', () => {
  test('caches function hover results by function name', async () => {
    const statement = 'from a | eval round(doubleField)';
    const triggerString = 'round';
    const kit = setupTestbed(statement, triggerString);

    // Nothing in cache initially
    expect(fromCache('round')).toBeUndefined();
    const result1 = await getHoverItem(statement, kit.offset, kit.callbacks);
    // Now should be cached
    expect(fromCache('round')).toBeDefined();

    // This retrieves from cache
    const result2 = await getHoverItem(statement, kit.offset, kit.callbacks);

    expect(result1).toEqual(result2);
    expect(result1.contents.some((item) => item.value.includes('round'))).toBe(true);
  });

  test('caches policy hover results by policy name', async () => {
    const statement = 'from a | enrich policy on field';
    const triggerString = 'policy';
    const kit = setupTestbed(statement, triggerString);
    // Nothing in cache initially
    expect(fromCache(triggerString)).toBeUndefined();
    const result1 = await getHoverItem(statement, kit.offset, kit.callbacks);

    // Now should be cached
    expect(fromCache(triggerString)).toBeDefined();

    // This retrieves from cache
    const result2 = await getHoverItem(statement, kit.offset, kit.callbacks);
    expect(result1).toEqual(result2);
  });
});

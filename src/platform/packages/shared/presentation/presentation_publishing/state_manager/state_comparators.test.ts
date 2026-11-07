/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { areComparatorsEqual, byValueComparator } from './state_comparators';
import type { StateComparators } from './types';

describe('byValueComparator', () => {
  interface TestState {
    content?: string;
    ref_id?: string;
  }

  const comparators: StateComparators<TestState> = {
    content: byValueComparator('referenceEquality'),
    ref_id: 'skip',
  };

  it('treats by-value keys as equal when both states are by reference', () => {
    expect(
      areComparatorsEqual(
        comparators,
        { ref_id: 'a', content: 'saved' },
        { ref_id: 'b', content: 'changed' }
      )
    ).toBe(true);
  });

  it.each([
    { name: 'unlinking', last: { ref_id: 'a' }, current: { content: 'inline' } },
    { name: 'linking', last: { content: 'inline' }, current: { ref_id: 'a' } },
  ])('compares by-value keys when $name', ({ last, current }) => {
    expect(areComparatorsEqual<TestState>(comparators, last, current)).toBe(false);
  });

  it('compares by-value keys when both states are by value', () => {
    expect(areComparatorsEqual(comparators, { content: 'same' }, { content: 'same' })).toBe(true);
    expect(areComparatorsEqual(comparators, { content: 'saved' }, { content: 'changed' })).toBe(
      false
    );
  });

  it('wraps custom comparator functions', () => {
    const caseInsensitive: StateComparators<TestState> = {
      content: byValueComparator<TestState, 'content'>(
        (a, b) => a?.toLowerCase() === b?.toLowerCase()
      ),
      ref_id: 'skip',
    };
    expect(areComparatorsEqual(caseInsensitive, { content: 'Same' }, { content: 'same' })).toBe(
      true
    );
  });
});

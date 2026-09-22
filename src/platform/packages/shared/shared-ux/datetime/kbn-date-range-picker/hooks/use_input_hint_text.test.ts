/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { useInputHintText } from './use_input_hint_text';

describe('useInputHintText', () => {
  it('returns a non-empty string on initial render', () => {
    const { result } = renderHook(() => useInputHintText(''));
    expect(result.current).toBeTruthy();
  });

  it('returns the same hint across re-renders when text stays empty', () => {
    const { result, rerender } = renderHook(() => useInputHintText(''));
    const first = result.current;

    rerender();
    expect(result.current).toBe(first);
  });

  it('returns the same hint when text changes from empty to non-empty', () => {
    const { result, rerender } = renderHook(({ text }) => useInputHintText(text), {
      initialProps: { text: '' },
    });
    const first = result.current;

    rerender({ text: 'last 7 days' });
    expect(result.current).toBe(first);
  });

  it('cycles to a new hint when text transitions from non-empty to empty', () => {
    const hints: string[] = [];

    const { result, rerender } = renderHook(({ text }) => useInputHintText(text), {
      initialProps: { text: '' },
    });
    hints.push(result.current);

    // Simulate typing then clearing several times to collect hints
    for (let i = 0; i < 10; i++) {
      rerender({ text: 'something' });
      rerender({ text: '' });
      hints.push(result.current);
    }

    // Each cycle should produce a non-empty hint
    hints.forEach((hint) => expect(hint).toBeTruthy());

    // At least two distinct hints should appear over 10 cycles
    const unique = new Set(hints);
    expect(unique.size).toBeGreaterThan(1);
  });

  it('does not cycle when text stays non-empty', () => {
    const { result, rerender } = renderHook(({ text }) => useInputHintText(text), {
      initialProps: { text: 'hello' },
    });
    const first = result.current;

    rerender({ text: 'world' });
    expect(result.current).toBe(first);
  });
});

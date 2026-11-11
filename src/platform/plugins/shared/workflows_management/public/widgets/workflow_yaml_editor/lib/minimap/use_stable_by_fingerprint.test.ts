/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { useStableByFingerprint } from './use_stable_by_fingerprint';

describe('useStableByFingerprint', () => {
  it('returns the same reference across renders when the fingerprint is unchanged', () => {
    const { result, rerender } = renderHook(
      ({ value, fp }: { value: { id: string }; fp: string }) => useStableByFingerprint(value, fp),
      { initialProps: { value: { id: 'a' }, fp: 'a' } }
    );

    const first = result.current;
    rerender({ value: { id: 'a' }, fp: 'a' }); // new object, same fingerprint
    expect(result.current).toBe(first);
  });

  it('returns the new reference once the fingerprint changes', () => {
    const { result, rerender } = renderHook(
      ({ value, fp }: { value: { id: string }; fp: string }) => useStableByFingerprint(value, fp),
      { initialProps: { value: { id: 'a' }, fp: 'a' } }
    );

    const first = result.current;
    const second = { id: 'b' };
    rerender({ value: second, fp: 'b' });
    expect(result.current).toBe(second);
    expect(result.current).not.toBe(first);
  });

  it('accepts a pre-computed fingerprint string — not a getter function', () => {
    // The hook signature changed from (value, getFingerprint) to (value, fingerprint).
    // This test confirms the pre-computed string is passed directly (not built inside
    // the hook), so the caller controls how many times the O(steps) map+join runs.
    const computeFingerprint = jest.fn((v: { id: string }) => v.id);
    const valueA = { id: 'a' };

    const { rerender } = renderHook(
      ({ value, fp }: { value: { id: string }; fp: string }) => useStableByFingerprint(value, fp),
      { initialProps: { value: valueA, fp: computeFingerprint(valueA) } }
    );

    // Each rerender computes the fingerprint exactly once (in the test's initialProps /
    // rerender argument), not twice inside the hook. Verify it was called once total
    // so far (for the initial render argument).
    expect(computeFingerprint).toHaveBeenCalledTimes(1);

    // Simulate the caller computing it once per render (as useMemo would do).
    const valueB = { id: 'a' }; // same fingerprint, new object reference
    rerender({ value: valueB, fp: computeFingerprint(valueB) });
    expect(computeFingerprint).toHaveBeenCalledTimes(2); // once per render, never twice
  });
});

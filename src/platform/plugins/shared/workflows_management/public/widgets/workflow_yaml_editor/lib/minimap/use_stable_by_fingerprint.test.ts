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
    const getFingerprint = (value: { id: string }) => value.id;
    const { result, rerender } = renderHook(
      ({ value }) => useStableByFingerprint(value, getFingerprint),
      {
        initialProps: { value: { id: 'a' } },
      }
    );

    const first = result.current;
    rerender({ value: { id: 'a' } }); // new object, same fingerprint
    expect(result.current).toBe(first);
  });

  it('returns the new reference once the fingerprint changes', () => {
    const getFingerprint = (value: { id: string }) => value.id;
    const { result, rerender } = renderHook(
      ({ value }) => useStableByFingerprint(value, getFingerprint),
      {
        initialProps: { value: { id: 'a' } },
      }
    );

    const first = result.current;
    const second = { id: 'b' };
    rerender({ value: second });
    expect(result.current).toBe(second);
    expect(result.current).not.toBe(first);
  });
});

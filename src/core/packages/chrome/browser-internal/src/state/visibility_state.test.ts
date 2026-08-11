/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import { BehaviorSubject, of } from 'rxjs';
import { useObservable } from '@kbn/use-observable';
import { createVisibilityState } from './visibility_state';
import type { InternalApplicationStart } from '@kbn/core-application-browser-internal';

const createMockApplication = (
  chromeless = false
): Pick<InternalApplicationStart, 'currentAppId$' | 'applications$'> => {
  const apps = new Map([['testApp', { chromeless }]]);
  return {
    currentAppId$: new BehaviorSubject('testApp'),
    applications$: of(apps as any),
  };
};

describe('createVisibilityState', () => {
  describe('isVisible$ emits synchronously on subscribe (shareReplay(1))', () => {
    it('emits true when app is not chromeless', () => {
      const { isVisible$ } = createVisibilityState({
        application: createMockApplication(false) as InternalApplicationStart,
      });

      let value: boolean | undefined;
      isVisible$.subscribe((v) => {
        value = v;
      });

      expect(value).toBe(true);
    });

    it('emits false when app is chromeless', () => {
      const { isVisible$ } = createVisibilityState({
        application: createMockApplication(true) as InternalApplicationStart,
      });

      let value: boolean | undefined;
      isVisible$.subscribe((v) => {
        value = v;
      });

      expect(value).toBe(false);
    });
  });

  it('setIsVisible(false) hides chrome', () => {
    const { isVisible$, setIsVisible } = createVisibilityState({
      application: createMockApplication(false) as InternalApplicationStart,
    });

    const values: boolean[] = [];
    isVisible$.subscribe((v) => values.push(v));

    setIsVisible(false);
    expect(values).toEqual([true, false]);
  });

  it('setIsVisible(true) restores chrome after hiding', () => {
    const { isVisible$, setIsVisible } = createVisibilityState({
      application: createMockApplication(false) as InternalApplicationStart,
    });

    const values: boolean[] = [];
    isVisible$.subscribe((v) => values.push(v));

    setIsVisible(false);
    setIsVisible(true);
    expect(values).toEqual([true, false, true]);
  });

  describe('useObservable integration', () => {
    it('useObservable(isVisible$, false) settles to the correct value synchronously', () => {
      const { isVisible$ } = createVisibilityState({
        application: createMockApplication(false) as InternalApplicationStart,
      });

      const { result } = renderHook(() => useObservable(isVisible$, false));

      // shareReplay(1) replays during subscribe, triggering a synchronous
      // re-render. The settled result is `true` — no async tick required.
      expect(result.current).toBe(true);
    });

    it('useObservable(isVisible$, false) stays false when app is chromeless', () => {
      const { isVisible$ } = createVisibilityState({
        application: createMockApplication(true) as InternalApplicationStart,
      });

      const { result } = renderHook(() => useObservable(isVisible$, false));

      expect(result.current).toBe(false);
    });

    it('reacts to setIsVisible changes', async () => {
      const { isVisible$, setIsVisible } = createVisibilityState({
        application: createMockApplication(false) as InternalApplicationStart,
      });

      const { result } = renderHook(() => useObservable(isVisible$, false));
      expect(result.current).toBe(true);

      await act(() => setIsVisible(false));
      expect(result.current).toBe(false);

      await act(() => setIsVisible(true));
      expect(result.current).toBe(true);
    });
  });
});

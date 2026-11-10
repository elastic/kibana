/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import { BehaviorSubject, EMPTY, of } from 'rxjs';
import { useObservable } from '@kbn/use-observable';
import { createVisibilityState, type VisibilityState } from './visibility_state';
import type { InternalApplicationStart } from '@kbn/core-application-browser-internal';

const createMockApplication = ({
  chromeless = false,
  hideChrome = false,
  appNotFound = false,
  currentAppId = 'testApp' as string | undefined,
}: {
  chromeless?: boolean;
  hideChrome?: boolean;
  appNotFound?: boolean;
  currentAppId?: string | undefined;
} = {}): Pick<InternalApplicationStart, 'currentAppId$' | 'applications$' | 'appNotFound$'> => {
  const apps = new Map(currentAppId ? [['testApp', { chromeless, hideChrome }]] : []);
  return {
    currentAppId$: currentAppId ? of(currentAppId) : EMPTY,
    applications$: of(apps as any),
    appNotFound$: new BehaviorSubject(appNotFound),
  };
};

const subscribeValues = (isVisible$: VisibilityState['isVisible$']): boolean[] => {
  const values: boolean[] = [];
  isVisible$.subscribe((value) => values.push(value));
  return values;
};

describe('createVisibilityState', () => {
  describe('isVisible$ emits synchronously on subscribe (shareReplay(1))', () => {
    it('emits true when app is not chromeless', () => {
      const { isVisible$ } = createVisibilityState({
        application: createMockApplication({ chromeless: false }) as InternalApplicationStart,
      });

      let value: boolean | undefined;
      isVisible$.subscribe((v) => {
        value = v;
      });

      expect(value).toBe(true);
    });

    it('emits false when app is chromeless', () => {
      const { isVisible$ } = createVisibilityState({
        application: createMockApplication({ chromeless: true }) as InternalApplicationStart,
      });

      let value: boolean | undefined;
      isVisible$.subscribe((v) => {
        value = v;
      });

      expect(value).toBe(false);
    });
  });

  describe('App.hideChrome', () => {
    it('emits false when app has hideChrome', () => {
      const { isVisible$ } = createVisibilityState({
        application: createMockApplication({ hideChrome: true }) as InternalApplicationStart,
      });

      expect(subscribeValues(isVisible$)).toEqual([false]);
    });

    it('stays hidden when setIsVisible(true) is called', () => {
      const { isVisible$, setIsVisible } = createVisibilityState({
        application: createMockApplication({ hideChrome: true }) as InternalApplicationStart,
      });

      const values = subscribeValues(isVisible$);
      setIsVisible(true);
      expect(values).toEqual([false]);
    });

    it('follows hideChrome updates on applications$', () => {
      const applications$ = new BehaviorSubject(new Map([['testApp', { hideChrome: true }]]));
      const { isVisible$ } = createVisibilityState({
        application: {
          currentAppId$: of('testApp'),
          applications$,
          appNotFound$: new BehaviorSubject(false),
        } as unknown as InternalApplicationStart,
      });

      const values = subscribeValues(isVisible$);
      applications$.next(new Map([['testApp', { hideChrome: false }]]));
      expect(values).toEqual([false, true]);
    });

    it('ignores hideChrome of apps that are no longer current', () => {
      const currentAppId$ = new BehaviorSubject('hidingApp');
      const applications$ = new BehaviorSubject(
        new Map([
          ['hidingApp', { hideChrome: true }],
          ['otherApp', {}],
        ])
      );
      const { isVisible$ } = createVisibilityState({
        application: {
          currentAppId$,
          applications$,
          appNotFound$: new BehaviorSubject(false),
        } as unknown as InternalApplicationStart,
      });

      const values = subscribeValues(isVisible$);
      currentAppId$.next('otherApp');
      applications$.next(applications$.value);
      expect(values).toEqual([false, true]);
    });
  });

  it('shows chrome when App Not Found even if no app is mounted', () => {
    const { isVisible$ } = createVisibilityState({
      application: createMockApplication({
        appNotFound: true,
        currentAppId: undefined,
      }) as InternalApplicationStart,
    });

    let value: boolean | undefined;
    isVisible$.subscribe((v) => {
      value = v;
    });

    expect(value).toBe(true);
  });

  it('keeps chrome hidden for App Not Found when force-hidden', () => {
    const { isVisible$, setIsVisible } = createVisibilityState({
      application: createMockApplication({ appNotFound: true }) as InternalApplicationStart,
    });

    const values: boolean[] = [];
    isVisible$.subscribe((v) => values.push(v));

    setIsVisible(false);
    expect(values.at(-1)).toBe(false);
  });

  it('setIsVisible(false) hides chrome', () => {
    const { isVisible$, setIsVisible } = createVisibilityState({
      application: createMockApplication() as InternalApplicationStart,
    });

    const values: boolean[] = [];
    isVisible$.subscribe((v) => values.push(v));

    setIsVisible(false);
    expect(values).toEqual([true, false]);
  });

  it('setIsVisible(true) restores chrome after hiding', () => {
    const { isVisible$, setIsVisible } = createVisibilityState({
      application: createMockApplication() as InternalApplicationStart,
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
        application: createMockApplication() as InternalApplicationStart,
      });

      const { result } = renderHook(() => useObservable(isVisible$, false));

      // shareReplay(1) replays during subscribe, triggering a synchronous
      // re-render. The settled result is `true` — no async tick required.
      expect(result.current).toBe(true);
    });

    it('useObservable(isVisible$, false) stays false when app is chromeless', () => {
      const { isVisible$ } = createVisibilityState({
        application: createMockApplication({ chromeless: true }) as InternalApplicationStart,
      });

      const { result } = renderHook(() => useObservable(isVisible$, false));

      expect(result.current).toBe(false);
    });

    it('reacts to setIsVisible changes', async () => {
      const { isVisible$, setIsVisible } = createVisibilityState({
        application: createMockApplication() as InternalApplicationStart,
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

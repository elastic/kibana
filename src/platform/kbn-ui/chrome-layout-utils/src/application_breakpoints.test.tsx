/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook } from '@testing-library/react';
import { APP_MAIN_SCROLL_CONTAINER_ID } from '@kbn/ui-chrome-layout-constants';
import {
  useCurrentChromeApplicationBreakpoint,
  useIsWithinChromeApplicationBreakpoints,
} from './application_breakpoints';

const EUI_BREAKPOINTS = {
  xs: 0,
  s: 575,
  m: 768,
  l: 992,
  xl: 1200,
};

jest.mock('@elastic/eui', () => ({
  useEuiTheme: () => ({
    euiTheme: { breakpoint: EUI_BREAKPOINTS },
  }),
}));

let resizeObserverCallback: ResizeObserverCallback | undefined;
const observeMock = jest.fn();
const disconnectMock = jest.fn();

class ResizeObserverMock {
  constructor(callback: ResizeObserverCallback) {
    resizeObserverCallback = callback;
  }

  observe = observeMock;
  disconnect = disconnectMock;
  unobserve = jest.fn();
}

const mountApplicationScrollContainer = (clientWidth = 0) => {
  const element = document.createElement('div');
  element.id = APP_MAIN_SCROLL_CONTAINER_ID;
  Object.defineProperty(element, 'clientWidth', { configurable: true, value: clientWidth });
  document.body.appendChild(element);
  return element;
};

const triggerResize = (width: number, options?: { emptyContentBoxSize?: boolean }) => {
  const contentRect = {} as DOMRectReadOnly;
  Object.defineProperty(contentRect, 'width', { value: width });
  const entry: Partial<ResizeObserverEntry> = {
    contentBoxSize: options?.emptyContentBoxSize ? [] : [{ blockSize: 0, inlineSize: width }],
    contentRect,
  };

  act(() => {
    resizeObserverCallback?.([entry as ResizeObserverEntry], {} as ResizeObserver);
  });
};

describe('useCurrentChromeApplicationBreakpoint', () => {
  beforeAll(() => {
    global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    resizeObserverCallback = undefined;
    document.body.innerHTML = '';
  });

  it('returns undefined when #app-main-scroll is missing', () => {
    const { result } = renderHook(() => useCurrentChromeApplicationBreakpoint());

    expect(result.current).toBeUndefined();
    expect(observeMock).not.toHaveBeenCalled();
  });

  it('observes #app-main-scroll and resolves breakpoints at boundaries', () => {
    const application = mountApplicationScrollContainer(768);

    const { result } = renderHook(() => useCurrentChromeApplicationBreakpoint());

    expect(observeMock).toHaveBeenCalledWith(application, { box: 'content-box' });
    expect(result.current).toBe('m');

    triggerResize(574);
    expect(result.current).toBe('xs');

    triggerResize(575);
    expect(result.current).toBe('s');

    triggerResize(767);
    expect(result.current).toBe('s');

    triggerResize(768);
    expect(result.current).toBe('m');

    triggerResize(991);
    expect(result.current).toBe('m');

    triggerResize(992);
    expect(result.current).toBe('l');

    triggerResize(1199);
    expect(result.current).toBe('l');

    triggerResize(1200);
    expect(result.current).toBe('xl');
  });

  it('falls back to contentRect width when contentBoxSize is empty', () => {
    mountApplicationScrollContainer();

    const { result } = renderHook(() => useCurrentChromeApplicationBreakpoint());

    triggerResize(768, { emptyContentBoxSize: true });
    expect(result.current).toBe('m');
  });

  it('disconnects ResizeObserver on unmount', () => {
    mountApplicationScrollContainer();

    const { unmount } = renderHook(() => useCurrentChromeApplicationBreakpoint());

    unmount();

    expect(disconnectMock).toHaveBeenCalled();
  });
});

describe('useIsWithinChromeApplicationBreakpoints', () => {
  beforeAll(() => {
    global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    resizeObserverCallback = undefined;
    document.body.innerHTML = '';
  });

  it('matches the current application breakpoint when responsive', () => {
    mountApplicationScrollContainer();

    const { result } = renderHook(() => useIsWithinChromeApplicationBreakpoints(['m', 'l'], true));

    expect(result.current).toBe(false);

    triggerResize(768);
    expect(result.current).toBe(true);

    triggerResize(575);
    expect(result.current).toBe(false);
  });

  it('returns false when responsive measurement is disabled', () => {
    mountApplicationScrollContainer();

    const { result } = renderHook(() => useIsWithinChromeApplicationBreakpoints(['m'], false));

    triggerResize(768);
    expect(result.current).toBe(false);
  });
});

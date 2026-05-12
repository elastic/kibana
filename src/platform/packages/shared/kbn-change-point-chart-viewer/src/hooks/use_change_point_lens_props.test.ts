/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { ReplaySubject } from 'rxjs';
import type { LensAttributes } from '@kbn/lens-embeddable-utils/config_builder';
import { LensConfigBuilder } from '@kbn/lens-embeddable-utils/config_builder';
import type { TimeRange } from '@kbn/data-plugin/common';
import { useChangePointLensProps, getChangePointLensProps } from './use_change_point_lens_props';

// ---- module mocks ----

jest.mock('@kbn/lens-embeddable-utils/config_builder', () => ({
  LensConfigBuilder: jest.fn(),
}));

jest.mock('@elastic/eui', () => ({
  useEuiTheme: () => ({ euiTheme: { size: { base: '16px' } } }),
}));

// IntersectionObserver is instantiated unconditionally inside the hook.
// The callback is captured per-test so viewport-gate tests can trigger it directly.
let capturedIntersectionCallback: IntersectionObserverCallback | null = null;

beforeAll(() => {
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: jest.fn().mockImplementation((cb: IntersectionObserverCallback) => {
      capturedIntersectionCallback = cb;
      return { observe: jest.fn(), disconnect: jest.fn() };
    }),
  });
});

beforeEach(() => {
  capturedIntersectionCallback = null;
});

// ---- types ----

type HookProps = Parameters<typeof useChangePointLensProps>[0];

// ---- stub data ----

const relativeTimeRangeStub: TimeRange = { from: 'now-30d', to: 'now' };
const absoluteTimeRangeStub: TimeRange = {
  from: '2024-01-01T00:00:00.000Z',
  to: '2024-01-31T23:59:59.000Z',
};

const attributesStub = {
  title: 'test chart',
  visualizationType: 'lnsXY',
  state: { query: { esql: 'FROM logs' }, filters: [], datasourceStates: {}, visualization: {} },
  references: [],
} as unknown as LensAttributes;

// chartLayers must be non-empty to pass the early-return guard inside buildAttributesFn.
const sampleLayers = [{ type: 'series' }] as HookProps['chartLayers'];

// ---- helpers ----

const makeDiscoverFetch$ = (): HookProps['discoverFetch$'] =>
  new ReplaySubject(1) as HookProps['discoverFetch$'];

const makeFetchParams = (
  overrides: Partial<HookProps['fetchParams']> = {}
): HookProps['fetchParams'] =>
  ({
    relativeTimeRange: relativeTimeRangeStub,
    timeRange: absoluteTimeRangeStub,
    searchSessionId: 'session-1',
    esqlVariables: [],
    lastReloadRequestTime: 0,
    ...overrides,
  } as HookProps['fetchParams']);

// Props are always created outside renderHook callbacks so object references (especially
// discoverFetch$) are stable across re-renders. Passing makeDefaultProps() inline would
// create a new ReplaySubject on every re-render, changing the useEffect dep array and
// causing an infinite subscription-teardown/rebuild loop.
const makeDefaultProps = (overrides: Partial<HookProps> = {}): HookProps => ({
  lensInstanceId: 'lens-1',
  title: 'My chart',
  query: 'FROM logs | CHANGE_POINT metric',
  chartLayers: sampleLayers,
  fetchParams: makeFetchParams(),
  services: {} as HookProps['services'],
  discoverFetch$: makeDiscoverFetch$(),
  ...overrides,
});

// ---- getChangePointLensProps — pure function tests ----
//
// These run synchronously and are decoupled from the async hook machinery.
// They cover the constant fields and optional field plumbing so the hook tests
// can focus exclusively on the reactive pipeline.

describe('getChangePointLensProps', () => {
  it('sets the constant Lens embeddable fields', () => {
    const result = getChangePointLensProps({
      id: 'lens-1',
      attributes: attributesStub,
      timeRange: absoluteTimeRangeStub,
      esqlVariables: [],
    });

    expect(result.viewMode).toBe('view');
    expect(result.noPadding).toBe(true);
    expect(result.executionContext).toEqual({ description: 'change point chart viewer' });
  });

  it('passes through id, timeRange, attributes, and esqlVariables', () => {
    const esqlVariables = [{ key: 'k', value: 'v' }] as HookProps['fetchParams']['esqlVariables'];

    const result = getChangePointLensProps({
      id: 'lens-42',
      attributes: attributesStub,
      timeRange: absoluteTimeRangeStub,
      esqlVariables,
    });

    expect(result.id).toBe('lens-42');
    expect(result.timeRange).toBe(absoluteTimeRangeStub);
    expect(result.attributes).toBe(attributesStub);
    expect(result.esqlVariables).toBe(esqlVariables);
  });

  it('passes through optional fields when provided', () => {
    const result = getChangePointLensProps({
      id: 'x',
      attributes: attributesStub,
      timeRange: absoluteTimeRangeStub,
      esqlVariables: undefined,
      searchSessionId: 'sess-1',
      lastReloadRequestTime: 999,
    });

    expect(result.searchSessionId).toBe('sess-1');
    expect(result.lastReloadRequestTime).toBe(999);
  });

  it('leaves optional fields undefined when not provided', () => {
    const result = getChangePointLensProps({
      id: 'x',
      attributes: attributesStub,
      timeRange: absoluteTimeRangeStub,
      esqlVariables: undefined,
    });

    expect(result.searchSessionId).toBeUndefined();
    expect(result.lastReloadRequestTime).toBeUndefined();
    expect(result.userMessages).toBeUndefined();
  });
});

// ---- useChangePointLensProps — reactive pipeline tests ----

describe('useChangePointLensProps', () => {
  let mockBuild: jest.Mock;

  beforeEach(() => {
    mockBuild = jest.fn().mockResolvedValue({ ...attributesStub });
    (LensConfigBuilder as jest.Mock).mockImplementation(() => ({ build: mockBuild }));
  });

  it('uses the timeRange override in preference to fetchParams.timeRange', async () => {
    const timeRangeOverride = { from: '2024-03-01T00:00:00.000Z', to: '2024-03-31T23:59:59.000Z' };
    const props = makeDefaultProps({ timeRange: timeRangeOverride });
    const { result } = renderHook(() => useChangePointLensProps(props));

    await waitFor(() => expect(result.current).toBeDefined());
    expect(result.current?.timeRange).toEqual(timeRangeOverride);
  });

  it('falls back to fetchParams.timeRange when no timeRange override is provided', async () => {
    // Guards the `timeRangeOverride ?? fetchParams.timeRange` fallback path.
    // fetchParams.timeRange is the resolved absolute range from the last Discover fetch,
    // matching the unified histogram pattern.
    const props = makeDefaultProps();
    const { result } = renderHook(() => useChangePointLensProps(props));

    await waitFor(() => expect(result.current).toBeDefined());
    expect(result.current?.timeRange).toEqual(absoluteTimeRangeStub);
  });

  it('sets attributes.description when a description is provided', async () => {
    const props = makeDefaultProps({ description: 'host: web-01' });
    const { result } = renderHook(() => useChangePointLensProps(props));

    await waitFor(() => expect(result.current).toBeDefined());
    expect(result.current?.attributes.description).toBe('host: web-01');
  });

  it('does not set attributes.description when no description is provided', async () => {
    // Guards the `if (description) { result.description = description }` branch in
    // buildAttributesFn. Without this test, removing the `if` guard and always assigning
    // description would only be caught by the positive test above.
    const props = makeDefaultProps();
    const { result } = renderHook(() => useChangePointLensProps(props));

    await waitFor(() => expect(result.current).toBeDefined());
    expect(result.current?.attributes.description).toBeUndefined();
  });

  it('remains undefined when chartLayers is empty and no error is set', async () => {
    // buildAttributesFn returns null → triggers$ never emits → state stays undefined.
    const props = makeDefaultProps({ chartLayers: [] });
    const { result } = renderHook(() => useChangePointLensProps(props));

    await act(async () => {});
    expect(result.current).toBeUndefined();
  });

  it('holds the build result until the chart enters the viewport', async () => {
    // Provide a real DOM element so the hook takes the IntersectionObserver path instead
    // of the immediate-emit fallback. capturedIntersectionCallback is set when the observer
    // is constructed (see beforeAll mock above).
    const chartRef = {
      current: document.createElement('div'),
    } as unknown as HookProps['chartRef'];
    const props = makeDefaultProps({ chartRef });
    const { result } = renderHook(() => useChangePointLensProps(props));

    // Build completes but no intersecting=true has been emitted yet — state must stay undefined.
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current).toBeUndefined();

    // Chart scrolls into view: the queued build result flushes through combineLatest.
    act(() => {
      capturedIntersectionCallback!(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });

    await waitFor(() => expect(result.current).toBeDefined());
  });

  it('rebuilds when discoverFetch$ emits a new value', async () => {
    const discoverFetch$ = makeDiscoverFetch$();
    const props = makeDefaultProps({ discoverFetch$ });
    const { result } = renderHook(() => useChangePointLensProps(props));

    await waitFor(() => expect(result.current).toBeDefined());
    const buildCallsAfterMount = mockBuild.mock.calls.length;

    act(() => {
      discoverFetch$.next({} as Parameters<typeof discoverFetch$.next>[0]);
    });

    await waitFor(() => expect(mockBuild.mock.calls.length).toBeGreaterThan(buildCallsAfterMount));
  });

  it('rebuilds when a card config prop changes (query)', async () => {
    // Guards the useEffect(() => chartConfigUpdates$.current.next(), [query, title, ...]) trigger.
    // If that effect were removed, the initial BehaviorSubject emission would still cause one
    // build on mount, but subsequent prop changes would silently stop triggering rebuilds.
    let query = 'FROM logs | CHANGE_POINT metric';
    const props = makeDefaultProps({ query });

    const { result, rerender } = renderHook(() => useChangePointLensProps({ ...props, query }));

    await waitFor(() => expect(result.current).toBeDefined());
    const buildCallsAfterMount = mockBuild.mock.calls.length;

    // Change the query prop and re-render — chartConfigUpdates$ should emit, triggering a rebuild.
    query = 'FROM metrics | CHANGE_POINT value';
    rerender();

    await waitFor(() => expect(mockBuild.mock.calls.length).toBeGreaterThan(buildCallsAfterMount));
  });

  it('survives a builder error and resolves correctly on the next trigger', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const discoverFetch$ = makeDiscoverFetch$();

    // First call (initial BehaviorSubject emission) throws; second call (discoverFetch$) succeeds.
    mockBuild
      .mockRejectedValueOnce(new Error('builder failed'))
      .mockResolvedValue({ ...attributesStub });

    const props = makeDefaultProps({ discoverFetch$ });
    const { result } = renderHook(() => useChangePointLensProps(props));

    // Let the failing build settle; result must remain undefined.
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current).toBeUndefined();

    // Trigger again — the subscription must still be alive after the earlier error.
    act(() => {
      discoverFetch$.next({} as Parameters<typeof discoverFetch$.next>[0]);
    });
    await waitFor(() => expect(result.current).toBeDefined());

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[useChangePointLensProps] Failed to build Lens attributes',
      expect.any(Error)
    );
    consoleErrorSpy.mockRestore();
  });
});

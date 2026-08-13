/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { initializeDrilldownsManager } from '@kbn/embeddable-plugin/public/drilldowns/drilldowns_manager';
import { openLazyFlyout } from '@kbn/presentation-util';
import { BehaviorSubject } from 'rxjs';
import type { ViewMode } from '@kbn/presentation-publishing';
import { getMockPresentationContainer } from '@kbn/presentation-publishing/interfaces/containers/mocks';
import { ON_APPLY_FILTER, ON_OPEN_PANEL_MENU } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { VegaParser } from '../data_model/vega_parser';
import type { VegaVisualizationDependencies } from '../plugin';
import { VEGA_EMBEDDABLE_TYPE, VEGA_EVENT_APPLY_FILTER } from '../constants';
import type { VegaEvent, VegaEventHandler } from '../types';
import { reportVegaRender } from '../lib/vega_render_telemetry';
import { vegaEmbeddableFactory } from './vega_embeddable';

jest.mock('@kbn/presentation-util', () => ({ openLazyFlyout: jest.fn() }));
jest.mock('../lib/vega_render_telemetry', () => ({ reportVegaRender: jest.fn() }));

interface MockVegaVisComponentProps {
  fireEvent: VegaEventHandler;
  renderComplete: () => void;
  showWarnings: boolean;
  visData: VegaParser;
}

const mockVegaRequestHandler = jest.fn();
const mockCreateVegaRequestHandler = jest.fn(
  (_deps: unknown, _context: { abortSignal: AbortSignal; inspectorAdapters: unknown }) =>
    mockVegaRequestHandler
);
let mockVegaVisComponentProps: MockVegaVisComponentProps | undefined;

jest.mock('../async_services', () => ({
  createVegaRequestHandler: mockCreateVegaRequestHandler,
  VegaVisComponent: (props: MockVegaVisComponentProps): null => {
    mockVegaVisComponentProps = props;
    return null;
  },
}));

const mockOpenLazyFlyout = jest.mocked(openLazyFlyout);
const mockReportVegaRender = jest.mocked(reportVegaRender);

describe('vegaEmbeddableFactory', () => {
  const executeTriggerActions = jest.fn();

  /**
   * Built fresh per test. The embeddable subscribes to these when it is built but only unsubscribes
   * when its component unmounts, so tests that build without rendering would otherwise keep fetching
   * off the next test's emissions.
   */
  const createParent = () => {
    const query$ = new BehaviorSubject({ language: 'kuery', query: '' });
    const filters$ = new BehaviorSubject([]);
    const timeRange$ = new BehaviorSubject({
      from: 'now-15m',
      to: 'now',
      mode: 'relative' as const,
    });
    const timeslice$ = new BehaviorSubject<[number, number] | undefined>(undefined);
    const reload$ = new BehaviorSubject<void>(undefined);
    const viewMode$ = new BehaviorSubject<ViewMode>('view');

    return {
      query$,
      filters$,
      timeRange$,
      timeslice$,
      reload$,
      viewMode$,
      parentApi: {
        ...getMockPresentationContainer(),
        executionContext: { type: 'dashboard' },
        filters$,
        query$,
        reload$,
        timeRange$,
        timeslice$,
        viewMode$,
      },
    };
  };

  let { query$, filters$, timeRange$, timeslice$, reload$, viewMode$, parentApi } = createParent();

  // Only forwarded to the request handler and the Vega component, both of which are mocked here.
  const visualizationDependencies = {
    core: coreMock.createSetup(),
    plugins: { data: dataPluginMock.createSetupContract() },
    getServiceSettings: jest.fn(),
  } as unknown as VegaVisualizationDependencies;

  const visData = { isVegaLite: false, useMap: false } as unknown as VegaParser;

  const buildEmbeddable = async () => {
    const factory = vegaEmbeddableFactory(coreMock.createStart(), {
      uiActions: { executeTriggerActions },
      visualizationDependencies,
    });
    const uuid = 'vega-panel';

    return factory.buildEmbeddable({
      initializeDrilldownsManager,
      initialState: { spec: '{ mark: point }', title: 'Initial title' },
      finalizeApi: (api) => ({
        ...api,
        uuid,
        type: VEGA_EMBEDDABLE_TYPE,
        parentApi,
        phase$: new BehaviorSubject(undefined),
      }),
      parentApi,
      uuid,
    });
  };

  /** The abort signal handed to the nth request handler created by the embeddable. */
  const abortSignalFor = (call: number): AbortSignal =>
    mockCreateVegaRequestHandler.mock.calls[call][1].abortSignal;

  beforeEach(() => {
    ({ query$, filters$, timeRange$, timeslice$, reload$, viewMode$, parentApi } = createParent());
    executeTriggerActions.mockReset();
    mockOpenLazyFlyout.mockReset();
    mockReportVegaRender.mockReset();
    mockCreateVegaRequestHandler.mockClear();
    mockVegaRequestHandler.mockReset();
    mockVegaRequestHandler.mockResolvedValue(visData);
    mockVegaVisComponentProps = undefined;
  });

  it('serializes and applies its state', async () => {
    const { api } = await buildEmbeddable();

    api.applySerializedState({
      spec: '{ mark: bar }',
      title: 'Updated title',
      time_range: {
        from: '2025-01-01T00:00:00.000Z',
        to: '2025-01-02T00:00:00.000Z',
        mode: 'absolute',
      },
    });

    expect(api.serializeState()).toEqual(
      expect.objectContaining({
        spec: '{ mark: bar }',
        title: 'Updated title',
        time_range: {
          from: '2025-01-01T00:00:00.000Z',
          to: '2025-01-02T00:00:00.000Z',
          mode: 'absolute',
        },
      })
    );
  });

  it('renders the Vega component from the resolved parser', async () => {
    const { api, Component: PanelComponent } = await buildEmbeddable();
    render(<PanelComponent />);

    await waitFor(() => expect(mockVegaVisComponentProps).toBeDefined());
    expect(mockVegaVisComponentProps?.visData).toBe(visData);
    expect(mockVegaVisComponentProps?.showWarnings).toBe(false);
    expect(mockVegaRequestHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        visParams: { spec: '{ mark: point }' },
        timeRange: { from: 'now-15m', to: 'now', mode: 'relative' },
      })
    );
    expect(api.dataLoading$.getValue()).toBe(false);
  });

  it('narrows the inherited time range to an absolute time slider selection', async () => {
    const { Component: PanelComponent } = await buildEmbeddable();
    render(<PanelComponent />);

    await waitFor(() => expect(mockVegaRequestHandler).toHaveBeenCalledTimes(1));
    timeslice$.next([
      Date.parse('2025-01-01T00:00:00.000Z'),
      Date.parse('2025-01-02T00:00:00.000Z'),
    ]);

    await waitFor(() => {
      expect(mockVegaRequestHandler).toHaveBeenLastCalledWith(
        expect.objectContaining({
          timeRange: {
            from: '2025-01-01T00:00:00.000Z',
            to: '2025-01-02T00:00:00.000Z',
            mode: 'absolute',
          },
        })
      );
    });
  });

  it.each([
    ['edit', true],
    ['view', false],
    ['print', false],
  ] as const)('shows warnings in %s view mode: %s', async (viewMode, expected) => {
    viewMode$.next(viewMode);
    const { Component: PanelComponent } = await buildEmbeddable();
    render(<PanelComponent />);

    await waitFor(() => expect(mockVegaVisComponentProps).toBeDefined());
    expect(mockVegaVisComponentProps?.showWarnings).toBe(expected);
  });

  it('picks up the dashboard view mode on the next fetch, keeping visData in step', async () => {
    const { Component: PanelComponent } = await buildEmbeddable();
    render(<PanelComponent />);

    await waitFor(() => expect(mockVegaVisComponentProps?.showWarnings).toBe(false));
    const initialVisData = mockVegaVisComponentProps?.visData;

    // Entering edit mode alone does not refetch, so the mode is picked up by the next fetch.
    viewMode$.next('edit');
    const refetchedVisData = { isVegaLite: true, useMap: false } as unknown as VegaParser;
    mockVegaRequestHandler.mockResolvedValue(refetchedVisData);
    reload$.next();

    await waitFor(() => expect(mockVegaVisComponentProps?.showWarnings).toBe(true));
    // VegaVisComponent rebuilds its view when showWarnings changes but only draws when visData
    // changes, so a new showWarnings value must always arrive with a new visData identity.
    expect(mockVegaVisComponentProps?.visData).toBe(refetchedVisData);
    expect(mockVegaVisComponentProps?.visData).not.toBe(initialVisData);
  });

  it('rerenders with refreshed Dashboard query, filters, and time range and cancels superseded requests', async () => {
    const { api, Component: PanelComponent } = await buildEmbeddable();
    const view = render(<PanelComponent />);

    await waitFor(() => expect(mockVegaRequestHandler).toHaveBeenCalledTimes(1));
    expect(abortSignalFor(0).aborted).toBe(false);

    query$.next({ language: 'kuery', query: 'response: 200' });
    await waitFor(() => {
      expect(mockVegaRequestHandler).toHaveBeenLastCalledWith(
        expect.objectContaining({ query: { language: 'kuery', query: 'response: 200' } })
      );
    });
    expect(abortSignalFor(0).aborted).toBe(true);

    filters$.next([{ meta: { alias: 'status filter' }, query: { match: { status: 200 } } }]);
    await waitFor(() => {
      expect(mockVegaRequestHandler).toHaveBeenLastCalledWith(
        expect.objectContaining({
          filters: [{ meta: { alias: 'status filter' }, query: { match: { status: 200 } } }],
        })
      );
    });

    timeRange$.next({ from: 'now-1h', to: 'now', mode: 'relative' });
    await waitFor(() => {
      expect(mockVegaRequestHandler).toHaveBeenLastCalledWith(
        expect.objectContaining({ timeRange: { from: 'now-1h', to: 'now', mode: 'relative' } })
      );
    });

    const lastCall = mockCreateVegaRequestHandler.mock.calls.length - 1;
    view.unmount();
    expect(abortSignalFor(lastCall).aborted).toBe(true);
    expect(api.rendered$.getValue()).toBe(false);
  });

  it('surfaces a failed request as a blocking error and completes the shared item', async () => {
    const error = new Error('index_not_found_exception');
    mockVegaRequestHandler.mockRejectedValue(error);
    const { api, Component: PanelComponent } = await buildEmbeddable();
    render(<PanelComponent />);

    await waitFor(() => expect(api.blockingError$.getValue()).toBe(error));
    expect(api.dataLoading$.getValue()).toBe(false);
    // Reporting waits on the shared item, so a panel that cannot render must still complete.
    expect(api.rendered$.getValue()).toBe(true);
    expect(mockVegaVisComponentProps).toBeUndefined();
  });

  it('routes filter events through ON_APPLY_FILTER', async () => {
    const { api, Component: PanelComponent } = await buildEmbeddable();
    render(<PanelComponent />);

    await waitFor(() => expect(mockVegaVisComponentProps).toBeDefined());
    mockVegaVisComponentProps?.fireEvent({
      name: VEGA_EVENT_APPLY_FILTER,
      data: { filters: [{ meta: {}, query: { match_all: {} } }] },
    });

    expect(api.supportedTriggers()).toEqual([ON_APPLY_FILTER, ON_OPEN_PANEL_MENU]);
    expect(executeTriggerActions).toHaveBeenCalledWith(ON_APPLY_FILTER, {
      embeddable: api,
      filters: [{ meta: {}, query: { match_all: {} } }],
    });
  });

  it('ignores events that are not Vega filter events', async () => {
    const { Component: PanelComponent } = await buildEmbeddable();
    render(<PanelComponent />);

    await waitFor(() => expect(mockVegaVisComponentProps).toBeDefined());
    // Cast because the emitter is untyped JavaScript: the guard exists for exactly this case, which
    // the types alone cannot rule out.
    mockVegaVisComponentProps?.fireEvent({
      name: 'someOtherEvent',
      data: { filters: [] },
    } as unknown as VegaEvent);

    expect(executeTriggerActions).not.toHaveBeenCalled();
  });

  it('exposes shared-item render metadata for Reporting and reports render telemetry', async () => {
    const { api, Component: PanelComponent } = await buildEmbeddable();
    const { container } = render(<PanelComponent />);
    const sharedItem = container.querySelector('[data-shared-item]');
    const renderComplete = jest.fn();

    expect(sharedItem).toHaveAttribute('data-title', 'Initial title');
    expect(sharedItem).toHaveAttribute('data-description', '');
    expect(sharedItem).toHaveAttribute('data-render-complete', 'false');

    sharedItem?.addEventListener('renderComplete', renderComplete);

    await waitFor(() => expect(mockVegaVisComponentProps).toBeDefined());
    await act(async () => {
      mockVegaVisComponentProps?.renderComplete();
    });

    await waitFor(() => {
      expect(api.rendered$.getValue()).toBe(true);
      expect(sharedItem).toHaveAttribute('data-render-complete', 'true');
      expect(renderComplete).toHaveBeenCalledTimes(1);
    });
    expect(mockReportVegaRender).toHaveBeenCalledWith({
      containerType: 'dashboard',
      isVegaLite: false,
      useMap: false,
    });
  });

  it('gives the flyout the focus targets to restore when it closes', async () => {
    const { api } = await buildEmbeddable();
    const returnFocus = jest.fn();

    api.onEdit({ isNewPanel: true, returnFocus });
    expect(mockOpenLazyFlyout.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        returnFocus,
        flyoutProps: expect.objectContaining({ focusedPanelId: api.uuid }),
      })
    );
  });

  it('restores the original spec when editing is cancelled', async () => {
    const { api } = await buildEmbeddable();
    const closeFlyout = jest.fn();

    api.onEdit();
    const flyout = mockOpenLazyFlyout.mock.calls[0][0];
    const content = (await flyout.loadContent({
      ariaLabelledBy: 'vega-flyout-title',
      closeFlyout,
    })) as React.ReactElement<{
      onRevert: () => void;
      onPreview: (spec: string) => void;
    }>;

    content.props.onPreview('{ mark: bar }');
    expect(api.serializeState().spec).toBe('{ mark: bar }');
    content.props.onRevert();
    expect(api.serializeState().spec).toBe('{ mark: point }');
    expect(jest.mocked(parentApi.removePanel)).not.toHaveBeenCalled();
  });

  it('removes the panel when editing is cancelled on a brand-new one', async () => {
    const { api } = await buildEmbeddable();

    api.onEdit({ isNewPanel: true });
    const flyout = mockOpenLazyFlyout.mock.calls[0][0];
    const content = (await flyout.loadContent({
      ariaLabelledBy: 'vega-flyout-title',
      closeFlyout: jest.fn(),
    })) as React.ReactElement<{ onRevert: () => void }>;

    // A new panel has no spec worth reverting to, so cancelling drops it from the dashboard.
    content.props.onRevert();

    expect(jest.mocked(parentApi.removePanel)).toHaveBeenCalledWith(api.uuid);
  });

  it('keeps the edited spec when saving', async () => {
    const { api } = await buildEmbeddable();
    const closeFlyout = jest.fn();

    api.onEdit();
    const flyout = mockOpenLazyFlyout.mock.calls[0][0];
    const content = (await flyout.loadContent({
      ariaLabelledBy: 'vega-flyout-title',
      closeFlyout,
    })) as React.ReactElement<{ onSave: (spec: string) => void }>;

    content.props.onSave('{ mark: bar }');

    expect(api.serializeState().spec).toBe('{ mark: bar }');
  });
});

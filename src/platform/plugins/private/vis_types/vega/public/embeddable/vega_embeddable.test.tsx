/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { initializeDrilldownsManager } from '@kbn/embeddable-plugin/public/drilldowns/drilldowns_manager';
import { openLazyFlyout } from '@kbn/presentation-util';
import { BehaviorSubject } from 'rxjs';
import { ESQLVariableType } from '@kbn/esql-types';
import { getESQLQueryVariables } from '@kbn/esql-utils';
import {
  apiHasLibraryTransforms,
  apiPublishesESQLQuery,
  type ViewMode,
} from '@kbn/presentation-publishing';
import { getMockPresentationContainer } from '@kbn/presentation-publishing/interfaces/containers/mocks';
import { ON_APPLY_FILTER, ON_OPEN_PANEL_MENU } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { VegaParser } from '../data_model/vega_parser';
import type { VegaVisualizationDependencies } from '../plugin';
import {
  VEGA_API_ENABLED_FLAG,
  VEGA_EMBEDDABLE_TYPE,
  VEGA_STANDALONE_EMBEDDABLE_FLAG,
} from '../../common/constants';
import { VEGA_EVENT_APPLY_FILTER } from '../constants';
import type { VegaEvent, VegaEventHandler } from '../types';
import { reportVegaRender } from '../lib/vega_render_telemetry';
import type {
  VegaByReferenceState,
  VegaByValueState,
  VegaEmbeddableState,
} from '../../server/embeddable/schema';
import { vegaClient } from '../vega_client/vega_client';
import { vegaEmbeddableFactory } from './vega_embeddable';

jest.mock('@kbn/presentation-util', () => ({ openLazyFlyout: jest.fn() }));
jest.mock('../lib/vega_render_telemetry', () => ({ reportVegaRender: jest.fn() }));
jest.mock('../lib/extract_index_pattern', () => ({
  extractIndexPatternsFromSpec: jest.fn(async (): Promise<never[]> => []),
}));
jest.mock('../vega_client/vega_client', () => ({
  vegaClient: {
    create: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
  },
}));
jest.mock('../vega_client/has_library_item_with_title', () => ({
  hasLibraryItemWithTitle: jest.fn(),
}));

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
    const esqlVariables$ = new BehaviorSubject<
      Array<{ key: string; value: string; type: ESQLVariableType }> | undefined
    >(undefined);
    const reload$ = new BehaviorSubject<void>(undefined);
    const viewMode$ = new BehaviorSubject<ViewMode>('view');

    return {
      query$,
      filters$,
      timeRange$,
      timeslice$,
      esqlVariables$,
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
        esqlVariables$,
        viewMode$,
      },
    };
  };

  let { query$, filters$, timeRange$, timeslice$, esqlVariables$, reload$, viewMode$, parentApi } =
    createParent();

  // Only forwarded to the request handler and the Vega component, both of which are mocked here.
  const visualizationDependencies = {
    core: coreMock.createSetup(),
    plugins: { data: dataPluginMock.createSetupContract() },
    getServiceSettings: jest.fn(),
  } as unknown as VegaVisualizationDependencies;

  const visData = { isVegaLite: false, useMap: false } as unknown as VegaParser;
  const libraryResponse = (
    spec: VegaByValueState['spec'],
    title = 'Library title',
    description = 'Description'
  ) => ({ id: 'vega-1', data: { title, description, spec }, meta: {} });

  const buildEmbeddable = async ({
    standaloneEmbeddableEnabled = false,
    apiEnabled = false,
    afterFactoryCreated,
    initialState = {
      spec: { format: 'hjson', value: '{ mark: point }' },
      title: 'Initial title',
    } as VegaEmbeddableState,
  }: {
    standaloneEmbeddableEnabled?: boolean;
    apiEnabled?: boolean;
    afterFactoryCreated?: (coreStart: ReturnType<typeof coreMock.createStart>) => void;
    initialState?: VegaEmbeddableState;
  } = {}) => {
    const coreStart = coreMock.createStart();
    coreStart.featureFlags.getBooleanValue.mockImplementation((key, fallback) => {
      if (key === VEGA_STANDALONE_EMBEDDABLE_FLAG) return standaloneEmbeddableEnabled;
      if (key === VEGA_API_ENABLED_FLAG) return apiEnabled;
      return fallback;
    });
    const factory = vegaEmbeddableFactory(coreStart, {
      uiActions: { executeTriggerActions },
      visualizationDependencies,
    });
    afterFactoryCreated?.(coreStart);
    const uuid = 'vega-panel';

    const embeddable = await factory.buildEmbeddable({
      initializeDrilldownsManager,
      initialState,
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
    return { ...embeddable, coreStart };
  };

  /** The abort signal handed to the nth request handler created by the embeddable. */
  const abortSignalFor = (call: number): AbortSignal =>
    mockCreateVegaRequestHandler.mock.calls[call][1].abortSignal;

  beforeEach(() => {
    ({ query$, filters$, timeRange$, timeslice$, esqlVariables$, reload$, viewMode$, parentApi } =
      createParent());
    executeTriggerActions.mockReset();
    mockOpenLazyFlyout.mockReset();
    mockReportVegaRender.mockReset();
    mockCreateVegaRequestHandler.mockClear();
    mockVegaRequestHandler.mockReset();
    mockVegaRequestHandler.mockResolvedValue(visData);
    mockVegaVisComponentProps = undefined;
    jest.mocked(vegaClient.create).mockReset();
    jest.mocked(vegaClient.get).mockReset();
    jest.mocked(vegaClient.update).mockReset();
  });

  it('serializes and applies its state', async () => {
    const { api } = await buildEmbeddable();

    api.applySerializedState({
      spec: { format: 'hjson', value: '{ mark: bar }' },
      title: 'Updated title',
      time_range: {
        from: '2025-01-01T00:00:00.000Z',
        to: '2025-01-02T00:00:00.000Z',
        mode: 'absolute',
      },
    });

    expect(api.serializeState()).toEqual(
      expect.objectContaining({
        spec: { format: 'hjson', value: '{ mark: bar }' },
        title: 'Updated title',
        time_range: {
          from: '2025-01-01T00:00:00.000Z',
          to: '2025-01-02T00:00:00.000Z',
          mode: 'absolute',
        },
      })
    );
  });

  it.each([
    [true, true],
    [false, false],
  ] as const)(
    'gates JSON export on the standalone embeddable flag (enabled=%s)',
    async (standaloneEmbeddableEnabled, supportsJsonExport) => {
      const { api } = await buildEmbeddable({ standaloneEmbeddableEnabled });
      expect(api.supportsJsonExport).toBe(supportsJsonExport);
    }
  );

  it('uses the feature flag values captured when the embeddable definition is created', async () => {
    const { api } = await buildEmbeddable({
      standaloneEmbeddableEnabled: true,
      apiEnabled: true,
      afterFactoryCreated: (coreStart) =>
        coreStart.featureFlags.getBooleanValue.mockReturnValue(false),
    });

    expect(api.supportsJsonExport).toBe(true);
    expect(apiHasLibraryTransforms(api)).toBe(true);
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
      onPreview: (spec: VegaByValueState['spec']) => void;
    }>;

    content.props.onPreview({ format: 'hjson', value: '{ mark: bar }' });
    expect((api.serializeState() as VegaByValueState).spec).toEqual({
      format: 'hjson',
      value: '{ mark: bar }',
    });
    content.props.onRevert();
    expect((api.serializeState() as VegaByValueState).spec).toEqual({
      format: 'hjson',
      value: '{ mark: point }',
    });
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
    })) as React.ReactElement<{ onSave: (spec: VegaByValueState['spec']) => void }>;

    content.props.onSave({ format: 'hjson', value: '{ mark: bar }' });

    expect((api.serializeState() as VegaByValueState).spec).toEqual({
      format: 'hjson',
      value: '{ mark: bar }',
    });
  });

  it('loads and publishes a referenced library item', async () => {
    const librarySpec = { format: 'hjson' as const, value: '{ mark: bar }' };
    jest
      .mocked(vegaClient.get)
      .mockResolvedValue(libraryResponse(librarySpec, 'Library title', 'Library description'));

    const { api } = await buildEmbeddable({
      standaloneEmbeddableEnabled: true,
      apiEnabled: true,
      initialState: {
        ref_id: 'vega-1',
        title: 'Panel title',
        time_range: { from: 'now-1h', to: 'now', mode: 'relative' },
      },
    });

    expect(vegaClient.get).toHaveBeenCalledWith('vega-1');
    expect(api.defaultTitle$.getValue()).toBe('Library title');
    expect(api.defaultDescription$.getValue()).toBe('Library description');
    expect(api.serializeState()).toEqual(
      expect.objectContaining({
        ref_id: 'vega-1',
        title: 'Panel title',
        time_range: { from: 'now-1h', to: 'now', mode: 'relative' },
      })
    );
    expect(apiHasLibraryTransforms(api)).toBe(true);
    if (!apiHasLibraryTransforms(api)) throw new Error('Expected Vega library transforms');
    expect(api.getSerializedStateByValue()).toEqual(
      expect.objectContaining({ spec: librarySpec, title: 'Panel title' })
    );
  });

  it('links a panel without losing panel-owned state', async () => {
    jest.mocked(vegaClient.create).mockResolvedValue(
      libraryResponse({
        format: 'hjson',
        value: '{ mark: point }',
      })
    );
    const { api } = await buildEmbeddable({
      standaloneEmbeddableEnabled: true,
      apiEnabled: true,
      initialState: {
        spec: { format: 'hjson', value: '{ mark: point }' },
        title: 'Panel title',
        time_range: { from: 'now-1h', to: 'now', mode: 'relative' },
      },
    });

    expect(apiHasLibraryTransforms(api)).toBe(true);
    if (!apiHasLibraryTransforms(api)) throw new Error('Expected Vega library transforms');
    await expect(api.saveToLibrary('Library title')).resolves.toBe('vega-1');
    expect(vegaClient.create).toHaveBeenCalledWith({
      title: 'Library title',
      description: undefined,
      spec: { format: 'hjson', value: '{ mark: point }' },
    });
    expect(api.getSerializedStateByReference('vega-1')).toEqual(
      expect.objectContaining({
        ref_id: 'vega-1',
        title: 'Panel title',
        time_range: { from: 'now-1h', to: 'now', mode: 'relative' },
      })
    );
  });

  it('updates the shared spec while retaining the latest library metadata', async () => {
    const originalSpec = { format: 'hjson' as const, value: '{ mark: point }' };
    const updatedSpec = { format: 'hjson' as const, value: '{ mark: bar }' };
    jest
      .mocked(vegaClient.get)
      .mockResolvedValueOnce(libraryResponse(originalSpec))
      .mockResolvedValueOnce(libraryResponse(originalSpec, 'Latest title', 'Latest description'));
    jest.mocked(vegaClient.update).mockResolvedValue(libraryResponse(updatedSpec));
    const { api } = await buildEmbeddable({
      standaloneEmbeddableEnabled: true,
      apiEnabled: true,
      initialState: { ref_id: 'vega-1', title: 'Panel title' },
    });

    api.onEdit();
    const flyout = mockOpenLazyFlyout.mock.calls[0][0];
    const content = (await flyout.loadContent({
      ariaLabelledBy: 'vega-flyout-title',
      closeFlyout: jest.fn(),
    })) as React.ReactElement<{
      onSave: (spec: VegaByValueState['spec']) => Promise<void>;
    }>;
    await content.props.onSave(updatedSpec);

    expect(vegaClient.update).toHaveBeenCalledWith('vega-1', {
      title: 'Latest title',
      description: 'Latest description',
      spec: updatedSpec,
    });
    expect(apiHasLibraryTransforms(api)).toBe(true);
    if (!apiHasLibraryTransforms(api)) throw new Error('Expected Vega library transforms');
    expect(api.getSerializedStateByValue()).toEqual(
      expect.objectContaining({ spec: updatedSpec, title: 'Panel title' })
    );
    expect(api.serializeState()).toEqual(
      expect.objectContaining({ ref_id: 'vega-1', title: 'Panel title' })
    );
  });

  it('retains the referenced draft and reports an error when a shared update fails', async () => {
    const originalSpec = { format: 'hjson' as const, value: '{ mark: point }' };
    const draftSpec = { format: 'hjson' as const, value: '{ mark: bar }' };
    jest.mocked(vegaClient.get).mockResolvedValue(libraryResponse(originalSpec));
    const error = new Error('update failed');
    jest.mocked(vegaClient.update).mockRejectedValue(error);
    const { api, coreStart } = await buildEmbeddable({
      standaloneEmbeddableEnabled: true,
      apiEnabled: true,
      initialState: { ref_id: 'vega-1' } as VegaByReferenceState,
    });

    api.onEdit();
    const flyout = mockOpenLazyFlyout.mock.calls[0][0];
    const content = (await flyout.loadContent({
      ariaLabelledBy: 'vega-flyout-title',
      closeFlyout: jest.fn(),
    })) as React.ReactElement<{
      onPreview: (spec: VegaByValueState['spec']) => void;
      onSave: (spec: VegaByValueState['spec']) => Promise<void>;
    }>;
    content.props.onPreview(draftSpec);

    await expect(content.props.onSave(draftSpec)).rejects.toBe(error);
    expect(coreStart.notifications.toasts.addError).toHaveBeenCalledWith(error, {
      title: 'Unable to update Vega library item',
    });
    expect(apiHasLibraryTransforms(api)).toBe(true);
    if (!apiHasLibraryTransforms(api)) throw new Error('Expected Vega library transforms');
    expect(api.getSerializedStateByValue()).toEqual(expect.objectContaining({ spec: draftSpec }));
  });

  it('forwards parent esqlVariables into the request handler and refetches on change', async () => {
    const variables = [{ key: 'fizzbuzz', value: 'ios', type: ESQLVariableType.VALUES }];
    esqlVariables$.next(variables);
    const { Component: PanelComponent } = await buildEmbeddable();
    render(<PanelComponent />);

    await waitFor(() => {
      expect(mockVegaRequestHandler).toHaveBeenCalledWith(
        expect.objectContaining({ esqlVariables: variables })
      );
    });

    const updated = [{ key: 'fizzbuzz', value: 'osx', type: ESQLVariableType.VALUES }];
    esqlVariables$.next(updated);

    await waitFor(() => {
      expect(mockVegaRequestHandler).toHaveBeenLastCalledWith(
        expect.objectContaining({ esqlVariables: updated })
      );
    });
  });

  it('publishes a verbatim ES|QL query$ for a single-source spec', async () => {
    const query = 'FROM logs-* | WHERE machine.os.keyword == ?fizzbuzz';
    const { api } = await buildEmbeddable();

    api.applySerializedState({
      spec: {
        format: 'hjson',
        value: `{ data: { url: { "%type%": "esql", query: "${query}" } } }`,
      },
      title: 'Initial title',
    });

    expect(api.query$.getValue()).toEqual({ esql: query });
    expect(apiPublishesESQLQuery(api)).toBe(true);
    expect(api).not.toHaveProperty('filters$');
  });

  it('does not publish an ES|QL query for non-ES|QL specs', async () => {
    const { api } = await buildEmbeddable();

    expect(api.query$.getValue()).toBeUndefined();
    expect(apiPublishesESQLQuery(api)).toBe(false);
  });

  it('updates query$ when the spec changes without waiting for a fetch', async () => {
    mockVegaRequestHandler.mockImplementation(() => new Promise(() => {}));
    const { api } = await buildEmbeddable();

    api.applySerializedState({
      spec: {
        format: 'hjson',
        value: `{ data: { url: { "%type%": "esql", query: "FROM logs-* | WHERE machine.os.keyword == ?fizzbuzz" } } }`,
      },
      title: 'Initial title',
    });
    expect(getESQLQueryVariables(api.query$.getValue()!.esql)).toContain('fizzbuzz');

    api.applySerializedState({
      spec: {
        format: 'hjson',
        value: `{ data: { url: { "%type%": "esql", query: "FROM logs-* | WHERE color.keyword == ?color" } } }`,
      },
      title: 'Initial title',
    });
    expect(getESQLQueryVariables(api.query$.getValue()!.esql)).toEqual(['color']);
    expect(getESQLQueryVariables(api.query$.getValue()!.esql)).not.toContain('fizzbuzz');
  });
});

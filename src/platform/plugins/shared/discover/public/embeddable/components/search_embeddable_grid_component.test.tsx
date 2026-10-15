/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { render, waitFor } from '@testing-library/react';
import type { EuiFlyoutMenuAction } from '@elastic/eui';
import { dataViewMock, esHitsMock } from '@kbn/discover-utils/src/__mocks__';
import { buildDataTableRecord } from '@kbn/discover-utils';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { createSearchSourceMock } from '@kbn/data-plugin/public/mocks';
import type { AggregateQuery, Filter, Query } from '@kbn/es-query';
import type { SavedSearch, DiscoverGridSettings, VIEW_MODE } from '@kbn/saved-search-plugin/common';
import {
  DataGridDensity,
  type SortOrder,
  type JsonModeSettings,
  type DocumentsDisplayMode,
} from '@kbn/unified-data-table';
import type { SearchResponseIncompleteWarning } from '@kbn/search-response-warnings/src/types';
import { ESQLVariableType } from '@kbn/esql-types';
import type { FetchContext } from '@kbn/presentation-publishing';
import type { DocViewerApi } from '@kbn/unified-doc-viewer';
import { createDiscoverServicesMock } from '../../__mocks__/services';
import { DiscoverTestProvider } from '../../__mocks__/test_provider';
import { createContextAwarenessMocks } from '../../context_awareness/__mocks__';
import { EMPTY_CONTEXT_AWARENESS_TOOLKIT } from '../../context_awareness';
import type { SearchEmbeddableApi, SearchEmbeddableStateManager } from '../types';
import { SearchEmbeddableGridComponent } from './search_embeddable_grid_component';
import type { EsqlSource } from '@kbn/data-source';
import { createMockEsqlSource } from '@kbn/data-source/src/__mocks__/esql_source.mock';

const createResultDataSource = (columnNames: string[]) =>
  createMockEsqlSource(
    columnNames.map((name) => ({ name, type: 'string', source: 'index' })),
    columnNames.map((name) => ({ id: name, name, meta: { type: 'string' } }))
  );

const mockDiscoverGridEmbeddableProps = jest.fn();

jest.mock('./saved_search_grid', () => ({
  DiscoverGridEmbeddable: (props: Record<string, unknown>) => {
    mockDiscoverGridEmbeddableProps(props);
    return <div data-test-subj="mockedDiscoverGridEmbeddable" />;
  },
}));

const createStateManager = (): SearchEmbeddableStateManager => ({
  columns: new BehaviorSubject<string[] | undefined>(['message']),
  resultDataSource: new BehaviorSubject<EsqlSource | undefined>(undefined),
  grid: new BehaviorSubject<DiscoverGridSettings | undefined>(undefined),
  rowHeight: new BehaviorSubject<number | undefined>(undefined),
  headerRowHeight: new BehaviorSubject<number | undefined>(undefined),
  rowsPerPage: new BehaviorSubject<number | undefined>(undefined),
  sampleSize: new BehaviorSubject<number | undefined>(100),
  sort: new BehaviorSubject<SortOrder[] | undefined>(undefined),
  viewMode: new BehaviorSubject<VIEW_MODE | undefined>(undefined),
  density: new BehaviorSubject<DataGridDensity | undefined>(undefined),
  documentsDisplayMode: new BehaviorSubject<DocumentsDisplayMode | undefined>(undefined),
  jsonModeSettings: new BehaviorSubject<JsonModeSettings | undefined>(undefined),
  rows: new BehaviorSubject<DataTableRecord[]>([]),
  totalHitCount: new BehaviorSubject<number | undefined>(undefined),
  inspectorAdapters: new BehaviorSubject<Record<string, unknown>>({}),
});

const createSavedSearch = ({
  isEsql,
  columns = ['message'],
  query,
}: {
  isEsql: boolean;
  columns?: string[];
  query?: string;
}): SavedSearch => {
  const searchSource = createSearchSourceMock({ index: dataViewMock });
  if (isEsql) {
    searchSource.setField('query', {
      esql: query ?? 'FROM test | LIMIT 100',
    } as AggregateQuery);
  } else {
    searchSource.setField('query', { query: '*', language: 'kuery' } as Query);
  }
  return {
    id: 'test-saved-search',
    title: 'Test Saved Search',
    searchSource,
    columns,
    sort: [],
    managed: false,
  };
};

const createApi = (
  savedSearch: SavedSearch,
  {
    parentApi,
    savedObjectId,
    panelFilters = [],
  }: {
    parentApi?: SearchEmbeddableApi['parentApi'];
    savedObjectId?: string;
    panelFilters?: Filter[];
  } = {}
) => {
  return {
    dataLoading$: new BehaviorSubject<boolean | undefined>(false),
    savedSearch$: new BehaviorSubject(savedSearch),
    savedObjectId$: new BehaviorSubject<string | undefined>(savedObjectId),
    fetchWarnings$: new BehaviorSubject<SearchResponseIncompleteWarning[]>([]),
    query$: new BehaviorSubject(savedSearch.searchSource.getField('query')),
    filters$: new BehaviorSubject<Filter[]>(panelFilters),
    fetchContext$: new BehaviorSubject<FetchContext | undefined>(undefined),
    abortSignal$: new BehaviorSubject<AbortSignal | undefined>(undefined),
    title$: new BehaviorSubject<string | undefined>('Test'),
    description$: new BehaviorSubject<string | undefined>(undefined),
    defaultTitle$: new BehaviorSubject<string | undefined>('Test'),
    defaultDescription$: new BehaviorSubject<string | undefined>(undefined),
    parentApi,
  } as unknown as SearchEmbeddableApi & {
    fetchWarnings$: BehaviorSubject<SearchResponseIncompleteWarning[]>;
    fetchContext$: BehaviorSubject<FetchContext | undefined>;
    abortSignal$: BehaviorSubject<AbortSignal | undefined>;
    query$: BehaviorSubject<AggregateQuery | Query | undefined>;
    savedSearch$: BehaviorSubject<SavedSearch>;
  };
};

describe('SearchEmbeddableGridComponent', () => {
  const services = createDiscoverServicesMock();
  const rows = esHitsMock.map((hit) => buildDataTableRecord(hit, dataViewMock));
  const getLastGridProps = () => mockDiscoverGridEmbeddableProps.mock.calls.at(-1)?.[0];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = async ({
    isEsql,
    columns,
    query,
    autoApplyDiscoverColumnDefaults,
    profileColumns,
    parentApi,
    showKeyboardShortcuts,
    showSortSelector,
    expandedDoc,
    fetchContext,
    resultDataSource,
    savedObjectId,
    panelFilters,
    services: servicesOverride = services,
    esqlSource$,
  }: {
    isEsql: boolean;
    columns?: string[];
    query?: string;
    autoApplyDiscoverColumnDefaults?: boolean;
    profileColumns?: Array<{ name: string; width?: number }>;
    parentApi?: SearchEmbeddableApi['parentApi'];
    showKeyboardShortcuts?: boolean;
    showSortSelector?: boolean;
    expandedDoc?: DataTableRecord;
    fetchContext?: FetchContext;
    resultDataSource?: EsqlSource;
    savedObjectId?: string;
    panelFilters?: Filter[];
    services?: ReturnType<typeof createDiscoverServicesMock>;
    esqlSource$?: BehaviorSubject<EsqlSource | undefined>;
  }) => {
    const savedSearch = createSavedSearch({ isEsql, columns, query });
    const api = createApi(savedSearch, { parentApi, savedObjectId, panelFilters });
    if (fetchContext) {
      api.fetchContext$.next(fetchContext);
    }
    const stateManager = createStateManager();
    stateManager.columns.next(savedSearch.columns);
    const docViewerRef = React.createRef<DocViewerApi>();
    stateManager.rows.next(rows);
    stateManager.totalHitCount.next(rows.length);
    if (resultDataSource) {
      stateManager.resultDataSource.next(resultDataSource);
    }

    const { dataSourceProfileProviderMock, profilesManagerMock, scopedEbtManagerMock } =
      createContextAwarenessMocks();
    if (profileColumns) {
      dataSourceProfileProviderMock.profile.getDefaultAppState = jest.fn(() => () => ({
        columns: profileColumns,
      }));
    }
    const scopedProfilesManager = profilesManagerMock.createScopedProfilesManager({
      scopedEbtManager: scopedEbtManagerMock,
      toolkit: EMPTY_CONTEXT_AWARENESS_TOOLKIT,
    });
    await scopedProfilesManager.resolveDataSourceProfile({
      dataView: dataViewMock,
      query: savedSearch.searchSource.getField('query'),
    });

    render(
      <DiscoverTestProvider
        services={servicesOverride}
        scopedProfilesManager={scopedProfilesManager}
      >
        <SearchEmbeddableGridComponent
          api={api}
          dataView={dataViewMock}
          esqlSource$={esqlSource$}
          stateManager={stateManager}
          enableDocumentViewer={true}
          autoApplyDiscoverColumnDefaults={autoApplyDiscoverColumnDefaults}
          showKeyboardShortcuts={showKeyboardShortcuts}
          showSortSelector={showSortSelector}
          inlineEditing={{
            isActive: false,
            hasPendingChanges: false,
            onApply: jest.fn(),
            onCancel: jest.fn(),
          }}
          docViewerRef={docViewerRef}
          expandedDoc={expandedDoc}
          initialDocViewerTabId={undefined}
        />
      </DiscoverTestProvider>
    );

    return { api, stateManager };
  };

  const getLastFlyoutMenuTrailingActions = (): EuiFlyoutMenuAction[] | undefined =>
    mockDiscoverGridEmbeddableProps.mock.calls.at(-1)?.[0]?.flyoutMenuTrailingActions;

  describe('onUpdateSampleSize', () => {
    it('should pass onUpdateSampleSize as undefined when in ES|QL mode', async () => {
      await renderComponent({ isEsql: true });

      await waitFor(() => {
        expect(mockDiscoverGridEmbeddableProps).toHaveBeenCalled();
      });

      const lastCallProps = getLastGridProps();
      expect(lastCallProps?.onUpdateSampleSize).toBeUndefined();
    });

    it('should pass onUpdateSampleSize as a function when not in ES|QL mode', async () => {
      await renderComponent({ isEsql: false });

      await waitFor(() => {
        expect(mockDiscoverGridEmbeddableProps).toHaveBeenCalled();
      });

      const lastCallProps = getLastGridProps();
      expect(lastCallProps?.onUpdateSampleSize).toBeDefined();
      expect(typeof lastCallProps?.onUpdateSampleSize).toBe('function');
    });
  });

  describe('onUpdateDataGridDensity', () => {
    it('updates density from the Display control', async () => {
      const { stateManager } = await renderComponent({ isEsql: false });

      await waitFor(() => {
        expect(mockDiscoverGridEmbeddableProps).toHaveBeenCalled();
      });

      const lastCallProps = mockDiscoverGridEmbeddableProps.mock.calls.at(-1)?.[0];
      const onUpdateDataGridDensity = lastCallProps?.onUpdateDataGridDensity as (
        density: DataGridDensity | undefined
      ) => void;

      expect(stateManager.density.getValue()).toBeUndefined();
      onUpdateDataGridDensity(DataGridDensity.COMPACT);
      expect(stateManager.density.getValue()).toBe(DataGridDensity.COMPACT);
    });
  });

  describe('dataSource', () => {
    it('passes the EsqlSource through to DiscoverGrid', async () => {
      const esqlSource = {
        kind: 'esql',
        id: 'esql-test',
        getColumns: () => [],
        getColumn: () => undefined,
      } as unknown as EsqlSource;

      await renderComponent({
        isEsql: true,
        esqlSource$: new BehaviorSubject<EsqlSource | undefined>(esqlSource),
      });

      await waitFor(() => {
        expect(mockDiscoverGridEmbeddableProps).toHaveBeenCalled();
      });

      const lastCallProps = mockDiscoverGridEmbeddableProps.mock.calls.at(-1)?.[0];
      expect(lastCallProps?.dataSource).toBe(esqlSource);
    });
  });

  describe('onResize', () => {
    it('should update the embeddable grid state', async () => {
      const { stateManager } = await renderComponent({ isEsql: false });

      await waitFor(() => {
        expect(mockDiscoverGridEmbeddableProps).toHaveBeenCalled();
      });

      const lastCallProps = getLastGridProps();
      const onResize = lastCallProps?.onResize as (params: {
        columnId: string;
        width: number | undefined;
      }) => void;

      onResize({ columnId: '_source', width: 250 });
      expect(stateManager.grid.getValue()).toEqual({ columns: { _source: { width: 250 } } });

      onResize({ columnId: '_source', width: undefined });
      expect(stateManager.grid.getValue()).toEqual({ columns: { _source: {} } });
    });
  });

  describe('autoApplyDiscoverColumnDefaults', () => {
    const categorizeQuery =
      'FROM kibana_sample_data_logs | STATS Count = COUNT(*), Sparkline = SPARKLINE(COUNT(*), @timestamp) BY Pattern = CATEGORIZE(message)';
    const categorizeResultDataSource = createResultDataSource(['Count', 'Sparkline', 'Pattern']);

    it('applies profile columns when opted in and stored columns are empty', async () => {
      const { stateManager } = await renderComponent({
        isEsql: true,
        columns: [],
        query: categorizeQuery,
        resultDataSource: categorizeResultDataSource,
        autoApplyDiscoverColumnDefaults: true,
        profileColumns: [
          { name: 'Count', width: 150 },
          { name: 'Sparkline', width: 150 },
          { name: 'Pattern' },
        ],
      });

      await waitFor(() => {
        const lastCallProps = mockDiscoverGridEmbeddableProps.mock.calls.at(-1)?.[0];
        expect(lastCallProps?.columns).toEqual(['Count', 'Sparkline', 'Pattern']);
        expect(lastCallProps?.settings).toEqual({
          columns: {
            Count: { width: 150 },
            Sparkline: { width: 150 },
          },
        });
      });
      expect(stateManager.columns.getValue()).toEqual([]);
    });

    it('persists a user resize without writing other profile widths', async () => {
      const { stateManager } = await renderComponent({
        isEsql: true,
        columns: [],
        query: categorizeQuery,
        resultDataSource: categorizeResultDataSource,
        autoApplyDiscoverColumnDefaults: true,
        profileColumns: [
          { name: 'Count', width: 150 },
          { name: 'Sparkline', width: 150 },
          { name: 'Pattern' },
        ],
      });

      await waitFor(() => {
        expect(mockDiscoverGridEmbeddableProps.mock.calls.at(-1)?.[0]?.onResize).toBeDefined();
      });

      const onResize = mockDiscoverGridEmbeddableProps.mock.calls.at(-1)?.[0]
        ?.onResize as (params: { columnId: string; width: number | undefined }) => void;

      onResize({ columnId: 'Count', width: 220 });
      expect(stateManager.grid.getValue()).toEqual({ columns: { Count: { width: 220 } } });
      expect(stateManager.columns.getValue()).toEqual([]);

      await waitFor(() => {
        expect(mockDiscoverGridEmbeddableProps.mock.calls.at(-1)?.[0]?.settings).toEqual({
          columns: {
            Count: { width: 220 },
            Sparkline: { width: 150 },
          },
        });
      });
    });

    it('does not persist profile widths when the user adds a column', async () => {
      const { api, stateManager } = await renderComponent({
        isEsql: true,
        columns: [],
        query: categorizeQuery,
        resultDataSource: categorizeResultDataSource,
        autoApplyDiscoverColumnDefaults: true,
        profileColumns: [
          { name: 'Count', width: 150 },
          { name: 'Sparkline', width: 150 },
          { name: 'Pattern' },
        ],
      });

      await waitFor(() => {
        expect(mockDiscoverGridEmbeddableProps.mock.calls.at(-1)?.[0]?.onAddColumn).toBeDefined();
      });

      const onAddColumn = mockDiscoverGridEmbeddableProps.mock.calls.at(-1)?.[0]?.onAddColumn as (
        columnName: string
      ) => void;
      onAddColumn('message');

      expect(stateManager.columns.getValue()).toEqual(['Count', 'Sparkline', 'Pattern', 'message']);
      expect(stateManager.grid.getValue()).toBeUndefined();

      api.savedSearch$.next({
        ...api.savedSearch$.getValue(),
        columns: stateManager.columns.getValue(),
      });

      await waitFor(() => {
        const lastCallProps = mockDiscoverGridEmbeddableProps.mock.calls.at(-1)?.[0];
        expect(lastCallProps?.columns).toEqual(['Count', 'Sparkline', 'Pattern', 'message']);
        expect(lastCallProps?.settings).toEqual({
          columns: {
            Count: { width: 150 },
            Sparkline: { width: 150 },
          },
        });
      });
    });

    it('recomputes display columns from query and result metadata, then keeps explicit columns', async () => {
      const { api, stateManager } = await renderComponent({
        isEsql: true,
        columns: [],
        query: categorizeQuery,
        resultDataSource: categorizeResultDataSource,
        autoApplyDiscoverColumnDefaults: true,
        profileColumns: [
          { name: 'Count', width: 150 },
          { name: 'Sparkline', width: 150 },
          { name: 'Pattern' },
        ],
      });

      await waitFor(() => {
        expect(mockDiscoverGridEmbeddableProps.mock.calls.at(-1)?.[0]?.columns).toEqual([
          'Count',
          'Sparkline',
          'Pattern',
        ]);
      });

      const statsQuery = { esql: 'FROM logs | STATS count = COUNT(*) BY status' } as AggregateQuery;
      const statsSavedSearch = createSavedSearch({
        isEsql: true,
        columns: [],
        query: statsQuery.esql,
      });
      api.query$.next(statsQuery);
      api.savedSearch$.next(statsSavedSearch);
      stateManager.resultDataSource.next(createResultDataSource(['count', 'status']));

      await waitFor(() => {
        expect(mockDiscoverGridEmbeddableProps.mock.calls.at(-1)?.[0]?.columns).toEqual([
          'count',
          'status',
        ]);
      });

      api.savedSearch$.next({ ...statsSavedSearch, columns: ['status'] });

      await waitFor(() => {
        expect(mockDiscoverGridEmbeddableProps.mock.calls.at(-1)?.[0]?.columns).toEqual(['status']);
      });
    });

    it('still applies variable-driven column replacement', async () => {
      await renderComponent({
        isEsql: true,
        columns: ['oldField'],
        query: 'FROM logs | KEEP oldField',
        resultDataSource: createResultDataSource(['timestamp', 'variableColumn']),
        autoApplyDiscoverColumnDefaults: true,
        parentApi: {
          esqlVariables$: new BehaviorSubject([
            { key: 'field', value: 'variableColumn', type: ESQLVariableType.FIELDS },
          ]),
        } as SearchEmbeddableApi['parentApi'],
      });

      await waitFor(() => {
        expect(mockDiscoverGridEmbeddableProps.mock.calls.at(-1)?.[0]?.columns).toEqual([
          'variableColumn',
        ]);
      });
    });
  });

  describe('toolbar chrome overrides', () => {
    it('forwards keyboard shortcut and sort selector flags', async () => {
      await renderComponent({
        isEsql: false,
        showKeyboardShortcuts: false,
        showSortSelector: false,
      });

      await waitFor(() => {
        expect(mockDiscoverGridEmbeddableProps).toHaveBeenCalled();
      });

      const lastCallProps = mockDiscoverGridEmbeddableProps.mock.calls.at(-1)?.[0];
      expect(lastCallProps?.showKeyboardShortcuts).toBe(false);
      expect(lastCallProps?.showSortSelector).toBe(false);
      expect(getLastFlyoutMenuTrailingActions()).toBeUndefined();
    });
  });

  describe('searchContext', () => {
    const fetchContext: FetchContext = {
      isReload: false,
      filters: [{ meta: { key: 'host' } }] as FetchContext['filters'],
      query: { query: 'host: web', language: 'kuery' },
      searchSessionId: 'session-embeddable',
      timeRange: { from: 'now-1d', to: 'now' },
      timeslice: undefined,
      esqlVariables: undefined,
      projectRouting: '_alias:_origin',
      isApproximate: true,
    };

    const resultDataSource = createMockEsqlSource(
      [],
      [{ id: 'message', name: 'message', meta: { type: 'string' } }]
    );

    it('passes a completed ES|QL table and dashboard filterQuery', async () => {
      const abortController = new AbortController();
      const { api } = await renderComponent({ isEsql: true, fetchContext, resultDataSource });
      api.abortSignal$.next(abortController.signal);

      await waitFor(() => {
        expect(mockDiscoverGridEmbeddableProps).toHaveBeenCalled();
      });

      const lastCallProps = getLastGridProps();
      expect(lastCallProps?.searchContext?.query).toEqual({ esql: 'FROM test | LIMIT 100' });
      expect(lastCallProps?.searchContext?.filterQuery).toEqual({
        query: 'host: web',
        language: 'kuery',
      });
      expect(lastCallProps?.searchContext?.table?.columns.map((c: { id: string }) => c.id)).toEqual(
        ['message']
      );
      expect(lastCallProps?.searchContext?.searchSessionId).toBe('session-embeddable');
      expect(lastCallProps?.searchContext?.projectRouting).toBe('_alias:_origin');
      expect(lastCallProps?.searchContext?.isApproximate).toBe(true);
      expect(lastCallProps?.searchContext?.abortSignal).toBe(abortController.signal);
    });

    it('still supplies searchContext when fetchContext has no time range', async () => {
      await renderComponent({
        isEsql: true,
        fetchContext: { ...fetchContext, timeRange: undefined },
        resultDataSource,
      });

      await waitFor(() => {
        expect(mockDiscoverGridEmbeddableProps).toHaveBeenCalled();
      });

      const lastCallProps = getLastGridProps();
      expect(lastCallProps?.searchContext?.query).toEqual({ esql: 'FROM test | LIMIT 100' });
      expect(lastCallProps?.searchContext?.table).toBeDefined();
      expect(lastCallProps?.searchContext?.timeRange).toBeUndefined();
    });

    it('changes requestId when the grid rows identity changes', async () => {
      const { stateManager } = await renderComponent({
        isEsql: true,
        fetchContext,
        resultDataSource,
      });

      await waitFor(() => {
        expect(mockDiscoverGridEmbeddableProps).toHaveBeenCalled();
      });

      const firstRequestId = getLastGridProps()?.searchContext?.requestId;

      stateManager.rows.next([...rows]);

      await waitFor(() => {
        const nextRequestId = getLastGridProps()?.searchContext?.requestId;
        expect(nextRequestId).not.toBe(firstRequestId);
      });
    });
  });

  describe('share direct link', () => {
    const expandedDoc = rows[0];
    const expandedDocRef = { id: esHitsMock[0]._id, index: esHitsMock[0]._index };

    const createServicesWithDiscoverAccess = () => {
      const servicesWithAccess = createDiscoverServicesMock();
      servicesWithAccess.capabilities.discover_v2.show = true;
      return servicesWithAccess;
    };

    it('provides a share direct link action for the expanded document', async () => {
      await renderComponent({
        isEsql: false,
        expandedDoc,
        services: createServicesWithDiscoverAccess(),
      });

      await waitFor(() => {
        expect(getLastFlyoutMenuTrailingActions()).toBeDefined();
      });

      const [action, ...rest] = getLastFlyoutMenuTrailingActions() ?? [];
      expect(rest).toHaveLength(0);
      expect(action.toolTipProps?.anchorProps).toHaveProperty(
        'data-test-subj',
        'discoverDocFlyoutShareDirectLink'
      );
    });

    it('copies a Discover link carrying the document identity and an absolute time range', async () => {
      const servicesWithAccess = createServicesWithDiscoverAccess();
      await renderComponent({
        isEsql: false,
        expandedDoc,
        fetchContext: {
          timeRange: { from: '2024-01-01T00:00:00.000Z', to: '2024-01-02T00:00:00.000Z' },
        } as FetchContext,
        services: servicesWithAccess,
      });

      await waitFor(() => {
        expect(getLastFlyoutMenuTrailingActions()).toBeDefined();
      });

      // pass a mock event to the onClick handler to simulate a click without an actual event
      getLastFlyoutMenuTrailingActions()?.[0]?.onClick?.(
        {} as React.MouseEvent<HTMLButtonElement, MouseEvent>
      );

      await waitFor(() => {
        expect(servicesWithAccess.locator.getRedirectUrl).toHaveBeenCalled();
      });

      const params = jest.mocked(servicesWithAccess.locator.getRedirectUrl).mock.calls[0][0];
      expect(params.expandedDoc).toEqual(expandedDocRef);
      expect(params.timeRange).toEqual({
        from: '2024-01-01T00:00:00.000Z',
        to: '2024-01-02T00:00:00.000Z',
      });
      expect(params.columns).toEqual(['message']);
      expect(params.sort).toEqual([]);
    });

    it('combines the panel filters with the dashboard filters so the result set matches', async () => {
      const panelFilter: Filter = { meta: { key: 'panel' } };
      const dashboardFilter: Filter = { meta: { key: 'dashboard' } };
      const servicesWithAccess = createServicesWithDiscoverAccess();
      await renderComponent({
        isEsql: false,
        expandedDoc,
        panelFilters: [panelFilter],
        fetchContext: { filters: [dashboardFilter] } as FetchContext,
        services: servicesWithAccess,
      });

      await waitFor(() => {
        expect(getLastFlyoutMenuTrailingActions()).toBeDefined();
      });

      // pass a mock event to the onClick handler to simulate a click without an actual event
      getLastFlyoutMenuTrailingActions()?.[0]?.onClick?.(
        {} as React.MouseEvent<HTMLButtonElement, MouseEvent>
      );

      await waitFor(() => {
        expect(servicesWithAccess.locator.getRedirectUrl).toHaveBeenCalled();
      });

      const params = jest.mocked(servicesWithAccess.locator.getRedirectUrl).mock.calls[0][0];
      expect(params.filters).toEqual([panelFilter, dashboardFilter]);
    });

    it('hides the share action when the user cannot access Discover', async () => {
      // The default mock grants neither `discover_v2.show` nor `discover_v2.save`.
      await renderComponent({ isEsql: false, expandedDoc });

      await waitFor(() => {
        expect(mockDiscoverGridEmbeddableProps).toHaveBeenCalled();
      });

      expect(getLastFlyoutMenuTrailingActions()).toBeUndefined();
    });
  });
});

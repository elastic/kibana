/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  AS_CODE_DATA_VIEW_REFERENCE_TYPE,
  AS_CODE_ESQL_DATA_SOURCE_TYPE,
} from '@kbn/as-code-data-views-schema';
import {
  discoverSessionApiEmbeddableByValueConfigSchema,
  type DiscoverSessionApiEmbeddableOverrides,
  type DiscoverSessionApiEmbeddableTab,
} from '@kbn/as-code-discover-schema';
import { FilterStateStore, type Filter } from '@kbn/es-query';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { discoverServiceMock } from '../../__mocks__/services';
import { getPersistedTabMock } from '../../application/main/state_management/redux/__mocks__/internal_state.mocks';
import { deserializeState, serializeState, toPanelTableSettings } from './serialization_utils';
import { fromDiscoverSessionTab } from './panel_tab';
import type {
  DiscoverSessionTab,
  DiscoverSessionTabTypeState,
} from '@kbn/saved-search-plugin/common';
import { VIEW_MODE } from '@kbn/saved-search-plugin/common';
import { DataGridDensity, DiscoverTabType } from '@kbn/discover-session-constants';
import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';
import type {
  DiscoverSessionEmbeddableByReferenceState,
  DiscoverSessionEmbeddableByValueState,
  DiscoverSessionEmbeddableState,
  SearchEmbeddableByReferenceState,
  SearchEmbeddableByValueState,
} from '../../../common/embeddable/types';

describe('Serialization utils', () => {
  const uuid = 'mySearchEmbeddable';

  const dataViewId = dataViewMock.id ?? 'test-id';

  const mockedSavedSearchAttributes: SearchEmbeddableByValueState['attributes'] = {
    kibanaSavedObjectMeta: {
      searchSourceJSON: '{"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
    },
    title: 'test1',
    description: 'description',
    sort: [['order_date', 'desc']],
    columns: ['_source'],
    grid: {},
    hideChart: false,
    hideTable: false,
    sampleSize: 100,
    isTextBasedQuery: false,
    tabs: [
      {
        id: 'tab-1',
        label: 'Tab 1',
        attributes: {
          kibanaSavedObjectMeta: {
            searchSourceJSON: '{"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
          },
          sort: [['order_date', 'desc']],
          columns: ['_source'],
          grid: {},
          hideChart: false,
          hideTable: false,
          sampleSize: 100,
          isTextBasedQuery: false,
        },
      },
    ],
  };

  /** Minimal API shape for by-value (DiscoverSessionEmbeddableByValueState) */
  const apiStateByValue: DiscoverSessionEmbeddableByValueState = {
    title: 'test panel title',
    description: 'description',
    hide_border: true,
    tabs: [
      {
        type: DiscoverTabType.Default,
        column_order: ['_source'],
        sort: [{ name: 'order_date', direction: 'desc' }],
        view_mode: VIEW_MODE.DOCUMENT_LEVEL,
        density: DataGridDensity.COMPACT,
        header_row_height: 'auto',
        row_height: 'auto',
        query: { language: 'kql', expression: '' },
        filters: [],
        rows_per_page: 100,
        sample_size: 100,
        data_source: { type: AS_CODE_DATA_VIEW_REFERENCE_TYPE, ref_id: dataViewId },
      },
    ],
  };

  const metricsTabTypeState: DiscoverSessionTabTypeState = {
    type: DiscoverTabType.Metrics,
    dimensions: ['host.name'],
    searchTerm: 'cpu',
    counterAggregation: 'max',
    gaugeAggregation: 'avg',
    histogramPercentile: 'p99',
  };

  const metricsByValueTab: DiscoverSessionApiEmbeddableTab = {
    type: DiscoverTabType.Metrics,
    dimensions: metricsTabTypeState.dimensions,
    search_term: metricsTabTypeState.searchTerm,
    counter_aggregation: metricsTabTypeState.counterAggregation,
    gauge_aggregation: metricsTabTypeState.gaugeAggregation,
    histogram_percentile: metricsTabTypeState.histogramPercentile,
    sort: [],
    data_source: {
      type: AS_CODE_ESQL_DATA_SOURCE_TYPE,
      query: 'TS metrics-*',
    },
  };

  const mockTab = (
    tabId: string,
    label: string,
    appStateOverrides: Record<string, unknown> = {}
  ): DiscoverSessionTab => ({
    ...getPersistedTabMock({
      tabId,
      dataView: dataViewMock,
      appStateOverrides: {
        columns: ['_source'],
        sort: [['order_date', 'desc']],
        sampleSize: 100,
        ...appStateOverrides,
      },
      services: discoverServiceMock,
    }),
    label,
  });

  const mockDiscoverSession = (sessionTabs: DiscoverSessionTab[]) =>
    createDiscoverSessionMock({
      id: 'savedSearch',
      title: 'test1',
      description: 'description',
      tabs: sessionTabs,
    });

  const getSessionTabsWithMetrics = (): DiscoverSessionTab[] => [
    {
      ...mockTab('metrics-tab', 'Metrics tab'),
      serializedSearchSource: { query: { esql: 'TS metrics-*' } },
      tabTypeState: metricsTabTypeState,
    },
    {
      ...mockTab('default-tab', 'Default tab'),
      serializedSearchSource: { query: { esql: 'FROM logs-*' } },
    },
  ];

  describe('deserialize state', () => {
    test('by value', async () => {
      const deserializedState = await deserializeState({
        serializedState: apiStateByValue,
        discoverServices: discoverServiceMock,
      });

      expect(deserializedState).toMatchObject({
        title: 'test panel title',
        hide_border: true,
        tab: apiStateByValue.tabs[0],
        columns: ['_source'],
        sort: [['order_date', 'desc']],
        serializedSearchSource: { index: dataViewId },
      });
    });

    test('by value restores Metrics profile state from the tab', async () => {
      const deserializedState = await deserializeState({
        serializedState: {
          title: 'Metrics panel',
          tabs: [metricsByValueTab],
        },
        discoverServices: discoverServiceMock,
      });

      expect(deserializedState.tabTypeState).toEqual(metricsTabTypeState);
    });

    test('by reference - default tab (no selectedTabId)', async () => {
      const sessionTabs = [
        mockTab('tab-1', 'Tab 1'),
        mockTab('tab-2', 'Tab 2', {
          columns: ['col-a', 'col-b'],
          sort: [['timestamp', 'asc']],
        }),
      ];
      discoverServiceMock.savedSearch.getDiscoverSession = jest
        .fn()
        .mockResolvedValue(mockDiscoverSession(sessionTabs));

      const apiStateByRef: DiscoverSessionEmbeddableByReferenceState = {
        title: 'test panel title',
        description: 'My description',
        ref_id: 'savedSearch',
        selected_tab_id: undefined,
        overrides: {},
        hide_border: true,
      };

      const deserializedState = await deserializeState({
        serializedState: apiStateByRef,
        discoverServices: discoverServiceMock,
      });

      expect(Object.keys(deserializedState)).toContain('serializedSearchSource');
      expect(Object.keys(deserializedState)).toContain('savedObjectId');
      expect(deserializedState.savedObjectId).toBe('savedSearch');
      expect(deserializedState.title).toEqual('test panel title');
      expect(deserializedState.hide_border).toBe(true);
    });

    test('by reference with panel overwrites', async () => {
      const sessionTabs = [mockTab('tab-1', 'Tab 1')];
      discoverServiceMock.savedSearch.getDiscoverSession = jest
        .fn()
        .mockResolvedValue(mockDiscoverSession(sessionTabs));

      const apiStateByRef: DiscoverSessionEmbeddableByReferenceState = {
        title: 'test panel title',
        description: 'My description',
        ref_id: 'savedSearch',
        selected_tab_id: undefined,
        overrides: { sort: [{ name: 'order_date', direction: 'asc' }] },
      };

      const deserializedState = await deserializeState({
        serializedState: apiStateByRef,
        discoverServices: discoverServiceMock,
      });

      expect(deserializedState.title).toEqual('test panel title');
      // For a valid/default tab, dashboard overrides win on top of resolved tab attributes
      expect(deserializedState.sort).toEqual([['order_date', 'asc']]);
      expect(deserializedState.columns).toEqual(['_source']); // from tab-1
      expect(deserializedState.selectedTabId).toEqual('tab-1');
      expect(deserializedState.tabs).toEqual(sessionTabs.map(fromDiscoverSessionTab));
    });

    test('by reference - valid selectedTabId', async () => {
      const sessionTabs = [
        mockTab('tab-1', 'Tab 1'),
        {
          ...mockTab('tab-2', 'Tab 2', {
            columns: ['col-a', 'col-b'],
            sort: [['timestamp', 'asc']],
            sampleSize: 200,
          }),
          serializedSearchSource: { query: { esql: 'TS metrics-*' } },
          tabTypeState: metricsTabTypeState,
        },
      ];
      discoverServiceMock.savedSearch.getDiscoverSession = jest
        .fn()
        .mockResolvedValue(mockDiscoverSession(sessionTabs));

      const serializedState: DiscoverSessionEmbeddableByReferenceState = {
        title: 'test panel title',
        ref_id: 'savedSearch',
        selected_tab_id: 'tab-2',
        overrides: {},
      };

      const deserializedState = await deserializeState({
        serializedState,
        discoverServices: discoverServiceMock,
      });
      expect(deserializedState.savedObjectId).toEqual('savedSearch');
      expect(deserializedState.selectedTabId).toEqual('tab-2');
      // Attributes should come from tab-2
      expect(deserializedState.columns).toEqual(['col-a', 'col-b']);
      expect(deserializedState.sort).toEqual([['timestamp', 'asc']]);
      // Like the session API, an ES|QL tab of a session has no sample size
      expect(deserializedState.sampleSize).toBeUndefined();
      expect(deserializedState.tabTypeState).toEqual(metricsTabTypeState);
    });

    test('by reference - deleted selectedTabId discards stale dashboard overrides', async () => {
      const sessionTabs = [
        mockTab('tab-1', 'Tab 1', {
          columns: ['fallback-col'],
          sort: [['fallback_field', 'desc']],
        }),
      ];
      discoverServiceMock.savedSearch.getDiscoverSession = jest
        .fn()
        .mockResolvedValue(mockDiscoverSession(sessionTabs));

      const serializedState: DiscoverSessionEmbeddableByReferenceState = {
        title: 'test panel title',
        ref_id: 'savedSearch',
        selected_tab_id: 'deleted-tab-id',
        overrides: {
          column_order: ['stale-col-a'],
          sort: [{ name: 'stale_field', direction: 'asc' }],
        },
      };

      const deserializedState = await deserializeState({
        serializedState,
        discoverServices: discoverServiceMock,
      });
      expect(deserializedState.selectedTabId).toEqual('deleted-tab-id');
      // Stale overrides from the deleted tab should not carry over
      expect(deserializedState.columns).toBeUndefined();
      expect(deserializedState.sort).toBeUndefined();
    });

    test('by reference - valid selectedTabId with dashboard overrides', async () => {
      const sessionTabs = [
        mockTab('tab-1', 'Tab 1'),
        mockTab('tab-2', 'Tab 2', {
          columns: ['col-a', 'col-b'],
          sort: [['timestamp', 'asc']],
        }),
      ];
      discoverServiceMock.savedSearch.getDiscoverSession = jest
        .fn()
        .mockResolvedValue(mockDiscoverSession(sessionTabs));

      const serializedState: DiscoverSessionEmbeddableByReferenceState = {
        title: 'test panel title',
        ref_id: 'savedSearch',
        selected_tab_id: 'tab-2',
        overrides: { column_order: ['custom-col'] },
      };

      const deserializedState = await deserializeState({
        serializedState,
        discoverServices: discoverServiceMock,
      });
      // For a valid tab, dashboard overrides should win on top of tab-2 attributes
      expect(deserializedState.columns).toEqual(['custom-col']);
      expect(deserializedState.sort).toEqual([['timestamp', 'asc']]);
    });

    test('by reference - partial jsonModeSettings override deep-merges with the source', async () => {
      const sessionTabs = [
        mockTab('tab-1', 'Tab 1', { jsonModeSettings: { hideNulls: true, wrapLines: true } }),
      ];
      discoverServiceMock.savedSearch.getDiscoverSession = jest
        .fn()
        .mockResolvedValue(mockDiscoverSession(sessionTabs));

      const serializedState: DiscoverSessionEmbeddableByReferenceState = {
        title: 'test panel title',
        ref_id: 'savedSearch',
        selected_tab_id: undefined,
        overrides: { wrap_lines: false },
      };

      const deserializedState = await deserializeState({
        serializedState,
        discoverServices: discoverServiceMock,
      });

      // jsonModeSettings partial-merges: wrap_lines is overridden while hide_nulls is preserved
      // from the source (a shallow replace dropped it).
      expect(deserializedState.jsonModeSettings).toEqual({ hideNulls: true, wrapLines: false });
    });

    test('by reference - grid override replaces wholesale so removed columns are not resurrected', async () => {
      const sessionTabs = [
        mockTab('tab-1', 'Tab 1', {
          grid: { columns: { A: { width: 100 }, B: { width: 200 } } },
        }),
      ];
      discoverServiceMock.savedSearch.getDiscoverSession = jest
        .fn()
        .mockResolvedValue(mockDiscoverSession(sessionTabs));

      const serializedState: DiscoverSessionEmbeddableByReferenceState = {
        title: 'test panel title',
        ref_id: 'savedSearch',
        selected_tab_id: undefined,
        // Column B's width was reset, so the stored override only carries A.
        overrides: { column_settings: { A: { width: 100 } } },
      };

      const deserializedState = await deserializeState({
        serializedState,
        discoverServices: discoverServiceMock,
      });

      // Unlike jsonModeSettings, grid must replace wholesale: B stays dropped, not merged back in.
      expect(deserializedState.grid).toEqual({ columns: { A: { width: 100 } } });
    });

    test('by reference - empty column settings override keeps the session widths', async () => {
      const grid = { columns: { A: { width: 100 } } };
      discoverServiceMock.savedSearch.getDiscoverSession = jest
        .fn()
        .mockResolvedValue(mockDiscoverSession([mockTab('tab-1', 'Tab 1', { grid })]));

      const deserializedState = await deserializeState({
        serializedState: { ref_id: 'savedSearch', overrides: { column_settings: {} } },
        discoverServices: discoverServiceMock,
      });

      expect(deserializedState.grid).toEqual(grid);
    });

    test('by reference - a tab without a Data View does not prevent opening another tab', async () => {
      const tabWithoutDataView: DiscoverSessionTab = {
        ...mockTab('tab-2', 'Tab 2'),
        // A tab saved before it loaded has no search source
        serializedSearchSource: {},
      };
      discoverServiceMock.savedSearch.getDiscoverSession = jest
        .fn()
        .mockResolvedValue(
          mockDiscoverSession([
            mockTab('tab-1', 'Tab 1', { columns: ['message'] }),
            tabWithoutDataView,
          ])
        );
      const deserialize = (selectedTabId: string) =>
        deserializeState({
          serializedState: { ref_id: 'savedSearch', selected_tab_id: selectedTabId, overrides: {} },
          discoverServices: discoverServiceMock,
        });

      expect((await deserialize('tab-1')).columns).toEqual(['message']);
      // The panel shows the missing Data View prompt for the tab without one
      expect((await deserialize('tab-2')).serializedSearchSource).toEqual({});
    });
  });

  describe('serialize state', () => {
    const serializers = {
      serializeTitles: jest.fn().mockReturnValue({}),
      serializeTimeRange: jest.fn().mockReturnValue({}),
      serializeDynamicActions: jest.fn().mockReturnValue({}),
    };

    test.each([
      ['Classic', apiStateByValue],
      ['ES|QL', { title: 'Metrics panel', tabs: [metricsByValueTab] }],
    ])('round-trips an unchanged %s by-value panel', async (_, serializedState) => {
      const runtimeState = await deserializeState({
        serializedState,
        discoverServices: discoverServiceMock,
      });

      expect(
        serializeState({
          ...serializers,
          serializeTitles: () => ({
            title: runtimeState.title,
            description: runtimeState.description,
            hide_border: runtimeState.hide_border,
          }),
          runtimeState,
          tableSettings: toPanelTableSettings(runtimeState),
        })
      ).toEqual(serializedState);
    });

    describe('by reference', () => {
      const getRuntimeState = async (
        sessionTabs: DiscoverSessionTab[],
        serializedState: DiscoverSessionEmbeddableState = { ref_id: 'savedSearch', overrides: {} }
      ) => {
        discoverServiceMock.savedSearch.getDiscoverSession = jest
          .fn()
          .mockResolvedValue(mockDiscoverSession(sessionTabs));

        return deserializeState({ serializedState, discoverServices: discoverServiceMock });
      };
      const getTabs = (state: DiscoverSessionEmbeddableState) =>
        'tabs' in state ? state.tabs : [];

      test('equal state', async () => {
        const runtimeState = await getRuntimeState([mockTab('tab-1', 'Tab 1')]);

        const serializedState = serializeState({
          ...serializers,
          runtimeState,
          tableSettings: toPanelTableSettings(runtimeState),
          savedObjectId: 'savedSearch',
          selectedTabId: runtimeState.selectedTabId,
        });

        expect(serializedState).toEqual({
          ref_id: 'savedSearch',
          selected_tab_id: 'tab-1',
          overrides: {},
        });
      });

      test('overwrite state', async () => {
        const runtimeState = await getRuntimeState([mockTab('tab-1', 'Tab 1')]);

        const serializedState = serializeState({
          ...serializers,
          runtimeState,
          tableSettings: {
            ...toPanelTableSettings(runtimeState),
            column_settings: { _source: { width: 250 } },
            sample_size: 500,
            sort: [{ name: 'order_date', direction: 'asc' }],
          },
          savedObjectId: 'savedSearch',
          selectedTabId: 'tab-1',
        });

        // Only the table settings edited on the panel are stored as overrides
        expect(serializedState).toEqual({
          ref_id: 'savedSearch',
          selected_tab_id: 'tab-1',
          overrides: {
            column_settings: { _source: { width: 250 } },
            sample_size: 500,
            sort: [{ name: 'order_date', direction: 'asc' }],
          },
        });
      });

      test('keeps the inline Data View of the session tab after reordering columns and reloading', async () => {
        const inlineDataViewId = 'inline-data-view';
        const pinnedHostFilter: Filter = {
          meta: {
            index: inlineDataViewId,
            type: 'phrase',
            key: 'host.name',
            params: { query: 'web-1' },
          },
          query: { match_phrase: { 'host.name': 'web-1' } },
          $state: { store: FilterStateStore.GLOBAL_STATE },
        };
        const sessionTab: DiscoverSessionTab = {
          ...mockTab('tab-1', 'Tab 1', { columns: ['host.name', 'message'] }),
          serializedSearchSource: {
            index: { id: inlineDataViewId, title: 'logs-*', timeFieldName: '@timestamp' },
            query: { query: '', language: 'kuery' },
            filter: [pinnedHostFilter],
          },
        };
        const runtimeState = await getRuntimeState([sessionTab]);

        const serializedState = serializeState({
          ...serializers,
          runtimeState,
          tableSettings: {
            ...toPanelTableSettings(runtimeState),
            column_order: ['message', 'host.name'],
          },
          savedObjectId: 'savedSearch',
          selectedTabId: runtimeState.selectedTabId,
        });
        const reloadedState = await getRuntimeState([sessionTab], serializedState);

        expect(serializedState).toEqual(
          expect.objectContaining({ overrides: { column_order: ['message', 'host.name'] } })
        );
        expect(reloadedState.columns).toEqual(['message', 'host.name']);
        expect(reloadedState.serializedSearchSource).toMatchObject({
          index: { id: inlineDataViewId },
          filter: [
            {
              meta: { index: inlineDataViewId, key: 'host.name' },
              query: { match_phrase: { 'host.name': 'web-1' } },
            },
          ],
        });
      });

      test('keeps the overrides while the selected tab is deleted', async () => {
        const overrides = { column_order: ['stale-col'] };
        const runtimeState = await getRuntimeState([mockTab('tab-1', 'Tab 1')], {
          ref_id: 'savedSearch',
          selected_tab_id: 'deleted-tab',
          overrides,
        });

        expect(
          serializeState({
            ...serializers,
            runtimeState,
            tableSettings: toPanelTableSettings(runtimeState),
            savedObjectId: 'savedSearch',
            selectedTabId: runtimeState.selectedTabId,
          })
        ).toEqual({ ref_id: 'savedSearch', selected_tab_id: 'deleted-tab', overrides });
      });

      test('unlinks the selected session tab as a public by-value tab with the panel overrides', async () => {
        const inlineDataViewId = 'inline-data-view';
        const sessionTabs: DiscoverSessionTab[] = [
          {
            ...mockTab('tab-1', 'Tab 1'),
            serializedSearchSource: {
              index: { id: inlineDataViewId, title: 'logs-*', timeFieldName: '@timestamp' },
              filter: [
                {
                  meta: {
                    index: inlineDataViewId,
                    type: 'phrase',
                    key: 'host.name',
                    params: { query: 'web-1' },
                  },
                  query: { match_phrase: { 'host.name': 'web-1' } },
                },
              ],
            },
          },
          ...getSessionTabsWithMetrics(),
        ];
        const unlink = async (
          selectedTabId: string,
          overrides: DiscoverSessionApiEmbeddableOverrides = {}
        ) => {
          const runtimeState = await getRuntimeState(sessionTabs, {
            ref_id: 'savedSearch',
            selected_tab_id: selectedTabId,
            overrides: { column_order: ['message'], ...overrides },
          });
          return getTabs(
            serializeState({
              ...serializers,
              runtimeState,
              tableSettings: toPanelTableSettings(runtimeState),
              selectedTabId,
            })
          );
        };

        const classicTabs = await unlink('tab-1');
        const esqlTabs = await unlink('metrics-tab');
        const [esqlTabWithSampleSize] = await unlink('metrics-tab', { sample_size: 100 });

        expect(() =>
          discoverSessionApiEmbeddableByValueConfigSchema.parse({ tabs: classicTabs })
        ).not.toThrow();
        expect(classicTabs).toEqual([expect.objectContaining({ column_order: ['message'] })]);
        expect(JSON.stringify(classicTabs)).not.toContain(inlineDataViewId);
        expect(() =>
          discoverSessionApiEmbeddableByValueConfigSchema.parse({ tabs: esqlTabs })
        ).not.toThrow();
        expect(esqlTabs).toEqual([
          expect.objectContaining({ type: DiscoverTabType.Metrics, column_order: ['message'] }),
        ]);
        // The ES|QL session tab has a sample size of 100, but only the panel's own one is kept
        expect(esqlTabs[0]).not.toHaveProperty('sample_size');
        expect(esqlTabWithSampleSize).toMatchObject({ sample_size: 100 });
      });
    });
  });

  describe('legacy panel state (BWC)', () => {
    test('deserialize by-ref uses savedObjectId', async () => {
      const sessionTabs = [mockTab('tab-1', 'Tab 1')];
      discoverServiceMock.savedSearch.getDiscoverSession = jest
        .fn()
        .mockResolvedValue(mockDiscoverSession(sessionTabs));

      const legacyByRef: SearchEmbeddableByReferenceState = {
        title: 'Panel title',
        savedObjectId: 'legacy-session-id',
      };

      const deserialized = await deserializeState({
        serializedState: legacyByRef,
        discoverServices: discoverServiceMock,
      });

      expect(deserialized.savedObjectId).toBe('legacy-session-id');
      expect(discoverServiceMock.savedSearch.getDiscoverSession).toHaveBeenCalledWith(
        'legacy-session-id'
      );
    });

    describe('by-value title and description', () => {
      const legacyAttributes = {
        ...mockedSavedSearchAttributes,
        references: [
          {
            name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
            type: 'index-pattern',
            id: dataViewId,
          },
        ],
      };

      test.each([
        [
          'a legacy panel that has them only in its attributes',
          { attributes: legacyAttributes },
          { title: 'test1', description: 'description' },
        ],
        [
          'a legacy panel whose own title and description are empty',
          { title: '', description: '', attributes: legacyAttributes },
          { title: '', description: '' },
        ],
        [
          'a tab returned from Discover over a legacy draft that has them only in its attributes',
          { attributes: legacyAttributes, tabs: apiStateByValue.tabs },
          { title: 'test1', description: 'description' },
        ],
      ])('come from %s and are saved', async (_, serializedState, expected) => {
        const deserialized = await deserializeState({
          serializedState,
          discoverServices: discoverServiceMock,
        });
        const serialized = serializeState({
          runtimeState: deserialized,
          tableSettings: toPanelTableSettings(deserialized),
          serializeTitles: () => ({
            title: deserialized.title,
            description: deserialized.description,
          }),
          serializeTimeRange: () => ({}),
          serializeDynamicActions: () => ({}),
        });

        expect(deserialized).toMatchObject(expected);
        expect(serialized).toMatchObject(expected);
      });
    });

    test('deserialize by-value uses the declarative tab merged over a legacy draft', async () => {
      const legacyDraft: SearchEmbeddableByValueState = {
        title: 'Custom panel title',
        attributes: mockedSavedSearchAttributes,
      };
      const incomingPackage: DiscoverSessionEmbeddableByValueState = {
        tabs: [{ ...apiStateByValue.tabs[0], column_order: ['message'] }],
      };

      // Dashboard merges the package from Discover over the panel state it restored
      const deserialized = await deserializeState({
        serializedState: { ...legacyDraft, ...incomingPackage },
        discoverServices: discoverServiceMock,
      });

      expect(deserialized.columns).toEqual(['message']);
      expect(deserialized.title).toBe('Custom panel title');
    });

    test('deserialize by-ref uses ref_id merged over a legacy draft', async () => {
      discoverServiceMock.savedSearch.getDiscoverSession = jest
        .fn()
        .mockResolvedValue(mockDiscoverSession([mockTab('tab-1', 'Tab 1')]));
      const legacyDraft: SearchEmbeddableByReferenceState = {
        title: 'Panel title',
        savedObjectId: 'legacy-session-id',
      };
      const incomingPackage: DiscoverSessionEmbeddableByReferenceState = {
        ref_id: 'new-session-id',
        overrides: {},
      };

      const deserialized = await deserializeState({
        serializedState: { ...legacyDraft, ...incomingPackage },
        discoverServices: discoverServiceMock,
      });

      expect(discoverServiceMock.savedSearch.getDiscoverSession).toHaveBeenCalledWith(
        'new-session-id'
      );
      expect(deserialized.savedObjectId).toBe('new-session-id');
      expect(deserialized.title).toBe('Panel title');
    });
  });
});

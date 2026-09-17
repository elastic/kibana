/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import assert from 'assert';
import { cloneDeep } from 'lodash';
import { BehaviorSubject } from 'rxjs';
import { fromStoredDataView, toStoredDataView } from '@kbn/as-code-data-views-transforms';
import {
  createSearchSource,
  injectReferences,
  parseSearchSourceJSON,
} from '@kbn/data-plugin/common';
import { ESQL_TYPE } from '@kbn/data-view-utils';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { DataViewsService } from '@kbn/data-views-plugin/common';
import { fromDiscoverSessionAttributesToSavedSearch } from '@kbn/saved-search-plugin/common';
import { generateInlineDataViewId } from '../../common/session/inline_data_view';
import { inlineDataViewIdCases, inlineSpec } from '../../common/session/inline_data_view.fixtures';
import type { SearchEmbeddablePanelApiState } from '../../common/embeddable/types';
import { createDiscoverServicesMock } from '../__mocks__/services';
import { initializeSearchEmbeddableApi } from './initialize_search_embeddable_api';
import type { SearchEmbeddableSerializedAttributes } from './types';
import { getDiscoverSessionEmbeddableComparators } from './utils/get_search_embeddable_comparators';
import { deserializeState, serializeState } from './utils/serialization_utils';

const createServices = () => {
  const services = createDiscoverServicesMock();
  const dataViews = new DataViewsService({
    uiSettings: {
      get: async <T>(key: string) => services.uiSettings.get<T>(key),
      getAll: async () => ({}),
      set: jest.fn(),
      remove: jest.fn(),
    },
    savedObjectsClient: {
      get: jest.fn(async (id: string) => ({
        id,
        type: 'index-pattern',
        attributes: { title: 'logs-*', timeFieldName: '@timestamp' },
        references: [],
        version: '1',
      })),
      find: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    apiClient: {
      getFieldsForWildcard: jest.fn(async () => ({
        fields: [
          {
            name: 'bytes',
            type: 'number',
            esTypes: ['long'],
            searchable: true,
            aggregatable: true,
          },
          {
            name: '@timestamp',
            type: 'date',
            esTypes: ['date'],
            searchable: true,
            aggregatable: true,
          },
        ],
        indices: ['logs-1'],
      })),
      hasUserDataView: jest.fn(),
    },
    fieldFormats: services.fieldFormats,
    onNotification: jest.fn(),
    onError: jest.fn(),
    getCanSave: async () => true,
    getCanSaveAdvancedSettings: async () => true,
    scriptedFieldsEnabled: true,
  });

  services.dataViews = Object.assign(dataViews, {
    getCanSaveSync: jest.fn(() => true),
    hasData: {
      hasESData: jest.fn(async () => true),
      hasUserDataView: jest.fn(async () => true),
      hasDataView: jest.fn(async () => true),
    },
    getIndices: jest.fn(async () => []),
    getRollupsEnabled: jest.fn(() => false),
    getExistingIndices: jest.fn(async () => []),
  });
  services.data.dataViews = services.dataViews;
  services.data.search.searchSource.create = createSearchSource(dataViews, {
    dataViews,
    aggs: services.data.search.aggs,
    search: services.data.search.search,
    getConfig: services.uiSettings.get,
    onResponse: (_request, response) => response,
    scriptedFieldsEnabled: true,
  });
  services.savedSearch.byValueToSavedSearch = async ({ attributes }, serialized) => {
    const [{ attributes: tabAttributes }] = attributes.tabs;
    const searchSourceFields = injectReferences(
      parseSearchSourceJSON(tabAttributes.kibanaSavedObjectMeta.searchSourceJSON),
      attributes.references ?? []
    );
    const searchSource = serialized
      ? searchSourceFields
      : await services.data.search.searchSource.create(searchSourceFields);

    return fromDiscoverSessionAttributesToSavedSearch(
      undefined,
      attributes,
      undefined,
      searchSource,
      false,
      serialized,
      undefined,
      attributes.references
    );
  };

  return services;
};

describe('Discover embeddable inline Data View identity integration', () => {
  let cleanups: Array<() => void>;

  beforeEach(() => {
    cleanups = [];
  });

  afterEach(() => {
    cleanups.forEach((cleanup) => cleanup());
  });

  const initialize = async (
    initialState: SearchEmbeddableSerializedAttributes,
    services = createServices()
  ) => {
    const result = await initializeSearchEmbeddableApi({
      initialState,
      discoverServices: services,
      dataLoading$: new BehaviorSubject<boolean | undefined>(false),
    });
    cleanups.push(result.cleanup);

    const dataViews = result.api.dataViews$.getValue() ?? [];
    expect(dataViews).toHaveLength(1);
    const [dataView] = dataViews;
    expect(dataView.id).toEqual(expect.any(String));
    expect(dataView.id).not.toBe('');
    return { ...result, dataView };
  };

  it('gives concurrent panels with the same ID-less spec the same Data View identity', async () => {
    const services = createServices();
    const initialState = { serializedSearchSource: { index: cloneDeep(inlineSpec) } };
    const originalState = cloneDeep(initialState);

    const [first, second] = await Promise.all([
      initialize(initialState, services),
      initialize(cloneDeep(initialState), services),
    ]);

    expect(first.dataView.id).toMatch(/^discover-inline-/);
    expect(second.dataView.id).toBe(first.dataView.id);
    expect(initialState).toEqual(originalState);
  });

  it.each(inlineDataViewIdCases)(
    'preserves the ID for %s through serialization and an as-code round trip',
    async (_description, spec) => {
      const initialSpec = cloneDeep(spec);
      const first = await initialize({ serializedSearchSource: { index: initialSpec } });
      const { id: _id, ...serializedSpec } = first.dataView.toSpec();
      const apiSpec = fromStoredDataView(first.dataView.toMinimalSpec());
      const storedSpec = toStoredDataView(apiSpec);

      const fromSerializedSpec = await initialize({
        serializedSearchSource: { index: serializedSpec },
      });
      const fromApiSpec = await initialize({ serializedSearchSource: { index: storedSpec } });

      expect(initialSpec).toEqual(spec);
      expect(storedSpec).not.toHaveProperty('id');
      expect(fromSerializedSpec.dataView.id).toBe(first.dataView.id);
      expect(fromApiSpec.dataView.id).toBe(first.dataView.id);
    }
  );

  it('preserves inline identity and filters through a by-value round trip', async () => {
    const initialState = {
      columns: ['bytes', 'bytes_runtime'],
      serializedSearchSource: {
        index: cloneDeep(inlineSpec),
        filter: [
          {
            meta: { type: 'phrase', key: 'bytes', params: { query: 100 } },
            query: { match_phrase: { bytes: 100 } },
          },
          {
            meta: { index: 'another-data-view', type: 'phrase', key: 'service' },
            query: { match_phrase: { service: 'checkout' } },
          },
        ],
      },
    };
    const originalPanel = await initialize(initialState);
    const serializationOptions = {
      uuid: 'inline-panel',
      initialState,
      serializeTitles: () => ({ title: 'Inline logs' }),
      serializeTimeRange: () => ({}),
      serializeDynamicActions: () => ({}),
    };
    const serializedPanel = serializeState({
      ...serializationOptions,
      savedSearch: originalPanel.api.savedSearch$.getValue(),
    });

    expect(serializedPanel).toHaveProperty('tabs.0.data_source.type', 'data_view_spec');
    expect(serializedPanel).not.toHaveProperty('tabs.0.data_source.id');
    expect(serializedPanel).not.toHaveProperty('tabs.0.filters.0.data_view_id');
    expect(serializedPanel).toHaveProperty('tabs.0.filters.1.data_view_id', 'another-data-view');

    const storedPanel: SearchEmbeddablePanelApiState = JSON.parse(JSON.stringify(serializedPanel));
    const reloadedServices = createServices();
    const deserializedState = await deserializeState({
      serializedState: storedPanel,
      discoverServices: reloadedServices,
    });
    const reloadedPanel = await initialize(deserializedState, reloadedServices);

    expect(reloadedPanel.dataView.id).toBe(originalPanel.dataView.id);
    expect(reloadedPanel.dataView.toSpec().runtimeFieldMap).toEqual(inlineSpec.runtimeFieldMap);
    expect(reloadedPanel.api.filters$.getValue()).toMatchObject([
      {
        meta: { key: 'bytes' },
        query: { match_phrase: { bytes: 100 } },
      },
      {
        meta: { index: 'another-data-view', key: 'service' },
        query: { match_phrase: { service: 'checkout' } },
      },
    ]);
    expect(reloadedPanel.api.filters$.getValue()).not.toHaveProperty('0.meta.index');
    const reserializedPanel = serializeState({
      ...serializationOptions,
      initialState: deserializedState,
      savedSearch: reloadedPanel.api.savedSearch$.getValue(),
    });
    expect(reserializedPanel).toEqual(serializedPanel);
  });

  it('persists matching runtime filter IDs as the stable by-value inline ID', async () => {
    const runtimeDataViewId = 'runtime-inline-id';
    const stableDataViewId = generateInlineDataViewId(inlineSpec);
    const initialState = {
      columns: ['bytes'],
      serializedSearchSource: {
        index: { ...cloneDeep(inlineSpec), id: runtimeDataViewId },
        filter: [
          {
            meta: {
              index: runtimeDataViewId,
              type: 'phrase',
              key: 'bytes',
              params: { query: 100 },
            },
            query: { match_phrase: { bytes: 100 } },
          },
          {
            meta: { index: 'another-data-view', type: 'phrase', key: 'service.name' },
            query: { match_phrase: { 'service.name': 'checkout' } },
          },
        ],
      },
    };
    const originalPanel = await initialize(initialState);
    const serializationOptions = {
      uuid: 'runtime-inline-panel',
      initialState,
      serializeTitles: () => ({ title: 'Runtime inline logs' }),
      serializeTimeRange: () => ({}),
      serializeDynamicActions: () => ({}),
    };

    expect(originalPanel.dataView.id).toBe(runtimeDataViewId);

    const serializedPanel = serializeState({
      ...serializationOptions,
      savedSearch: originalPanel.api.savedSearch$.getValue(),
    });

    expect(serializedPanel).toHaveProperty('tabs.0.filters.0.data_view_id', stableDataViewId);
    expect(serializedPanel).toHaveProperty('tabs.0.filters.1.data_view_id', 'another-data-view');

    const reloadedServices = createServices();
    const deserializedState = await deserializeState({
      serializedState: serializedPanel,
      discoverServices: reloadedServices,
    });
    const reloadedPanel = await initialize(deserializedState, reloadedServices);

    expect(reloadedPanel.dataView.id).toBe(stableDataViewId);
    expect(reloadedPanel.api.filters$.getValue()).toMatchObject([
      { meta: { index: stableDataViewId, key: 'bytes' } },
      { meta: { index: 'another-data-view', key: 'service.name' } },
    ]);

    const reserializedPanel = serializeState({
      ...serializationOptions,
      initialState: deserializedState,
      savedSearch: reloadedPanel.api.savedSearch$.getValue(),
    });
    expect(reserializedPanel).toEqual(serializedPanel);
  });

  it('keeps an ID-less spec addressable by a saved dashboard filter after a cold load', async () => {
    const first = await initialize({ serializedSearchSource: { index: cloneDeep(inlineSpec) } });
    const dashboardFilter = {
      meta: { index: first.dataView.id, key: 'bytes', disabled: false, negate: false },
      query: { match_phrase: { bytes: 100 } },
    };

    const reloaded = await initialize({
      serializedSearchSource: { index: cloneDeep(inlineSpec) },
    });

    expect(reloaded.dataView.id).toBe(dashboardFilter.meta.index);
    expect(reloaded.dataView.fields.getByName(dashboardFilter.meta.key)).toBeDefined();
  });

  it('does not report unsaved changes when loading a by-value panel with an indexless filter', async () => {
    const services = createServices();
    const initialState = {
      columns: ['bytes'],
      serializedSearchSource: {
        index: { ...inlineSpec, name: 'logs-*', allowHidden: false },
        filter: [
          {
            meta: { type: 'phrase', key: 'bytes', params: { query: 100 } },
            query: { match_phrase: { bytes: 100 } },
          },
        ],
      },
    };
    const savedSearchSource = await services.data.search.searchSource.create(
      initialState.serializedSearchSource
    );
    const { api } = await initialize(initialState, services);
    const savedSearch = api.savedSearch$.getValue();
    const serializationOptions = {
      uuid: 'inline-panel',
      initialState,
      serializeTitles: () => ({}),
      serializeTimeRange: () => ({}),
      serializeDynamicActions: () => ({}),
    };
    const savedPanel = serializeState({
      ...serializationOptions,
      savedSearch: { ...savedSearch, searchSource: savedSearchSource },
    });
    const currentPanel = serializeState({ ...serializationOptions, savedSearch });
    const comparators = getDiscoverSessionEmbeddableComparators(true, false);

    assert('tabs' in savedPanel && 'tabs' in currentPanel);
    assert('tabs' in comparators && typeof comparators.tabs === 'function');

    expect(savedPanel).toHaveProperty('tabs.0.filters.0');
    expect(savedPanel).not.toHaveProperty('tabs.0.filters.0.data_view_id');
    expect(api.filters$.getValue()).toEqual(initialState.serializedSearchSource.filter);
    expect(comparators.tabs(savedPanel.tabs, currentPanel.tabs)).toBe(true);
  });

  it.each<[string, DataViewSpec]>([
    ['index pattern', { ...inlineSpec, title: 'other-logs-*' }],
    ['time field', { ...inlineSpec, timeFieldName: 'event.created' }],
    ['name', { ...inlineSpec, name: 'Other logs' }],
    ['hidden indices setting', { ...inlineSpec, allowHidden: true }],
    ['field filters', { ...inlineSpec, sourceFilters: [{ value: 'secret.*' }] }],
    [
      'field format',
      { ...inlineSpec, fieldFormats: { bytes: { id: 'number', params: { pattern: '0.00' } } } },
    ],
    ['field label', { ...inlineSpec, fieldAttrs: { bytes: { customLabel: 'Bytes transferred' } } }],
    [
      'runtime field script',
      {
        ...inlineSpec,
        runtimeFieldMap: {
          bytes_runtime: { type: 'long', script: { source: 'emit(doc["bytes"].value * 2)' } },
        },
      },
    ],
  ])(
    'keeps specs with a different %s separate in the same cache',
    async (_difference, changedSpec) => {
      const services = createServices();
      const original = await initialize(
        { serializedSearchSource: { index: cloneDeep(inlineSpec) } },
        services
      );
      const changed = await initialize(
        { serializedSearchSource: { index: cloneDeep(changedSpec) } },
        services
      );

      expect(changed.dataView.id).not.toBe(original.dataView.id);
      expect(original.dataView.toSpec()).toMatchObject(inlineSpec);
      expect(changed.dataView.toSpec()).toMatchObject(changedSpec);
    }
  );

  it('changes and restores a panel identity without changing the other panel', async () => {
    const services = createServices();
    const initialState = { serializedSearchSource: { index: cloneDeep(inlineSpec) } };
    const { api, dataView, reinitializeState } = await initialize(initialState, services);
    const otherPanel = await initialize(cloneDeep(initialState), services);

    expect(otherPanel.dataView.id).toBe(dataView.id);

    await reinitializeState({
      serializedSearchSource: {
        index: {
          ...inlineSpec,
          runtimeFieldMap: {
            bytes_runtime: { type: 'long', script: { source: 'emit(doc["bytes"].value * 2)' } },
          },
        },
      },
    });
    expect(api.dataViews$.getValue()).toHaveLength(1);
    expect(api.dataViews$.getValue()?.map(({ id }) => id)).not.toEqual([dataView.id]);
    expect(otherPanel.api.dataViews$.getValue()?.map(({ id }) => id)).toEqual([dataView.id]);
    expect(otherPanel.dataView.toSpec()).toMatchObject(inlineSpec);

    await reinitializeState(initialState);
    expect(api.dataViews$.getValue()?.map(({ id }) => id)).toEqual([dataView.id]);
    expect(otherPanel.dataView.toSpec()).toMatchObject(inlineSpec);
  });

  it('preserves indexless filters and explicit references without mutating inputs', async () => {
    const localFilter = {
      meta: { disabled: true, negate: true, alias: 'Excluded bytes' },
      query: { match_phrase: { bytes: 100 } },
    };
    const externalFilter = {
      meta: { index: 'another-data-view' },
      query: { match_phrase: { service: 'checkout' } },
    };
    const oldFilter = {
      meta: { index: 'old-inline-uuid' },
      query: { match_phrase: { bytes: 200 } },
    };
    const initialState = {
      serializedSearchSource: {
        index: cloneDeep(inlineSpec),
        filter: [localFilter, externalFilter, oldFilter],
      },
    };
    const originalState = cloneDeep(initialState);
    const { api } = await initialize(initialState);

    expect(api.filters$.getValue()).toEqual([localFilter, externalFilter, oldFilter]);
    expect(initialState).toEqual(originalState);
  });

  it('preserves a legacy inline ID and its filter references on a cold load', async () => {
    const initialState = {
      serializedSearchSource: {
        index: { ...inlineSpec, id: 'legacy-inline-id' },
        filter: [
          {
            meta: { index: 'legacy-inline-id' },
            query: { match_phrase: { bytes: 100 } },
          },
          {
            meta: { index: 'another-data-view' },
            query: { match_phrase: { service: 'checkout' } },
          },
        ],
      },
    };
    const first = await initialize(cloneDeep(initialState));
    const reloaded = await initialize(cloneDeep(initialState));

    expect(first.dataView.id).toBe('legacy-inline-id');
    expect(reloaded.dataView.id).toBe('legacy-inline-id');
    expect(reloaded.api.filters$.getValue()).toEqual(initialState.serializedSearchSource.filter);
  });

  it('does not merge different legacy IDs even when their inline specs match', async () => {
    const services = createServices();
    const first = await initialize(
      { serializedSearchSource: { index: { ...inlineSpec, id: 'first-inline-id' } } },
      services
    );
    const second = await initialize(
      { serializedSearchSource: { index: { ...inlineSpec, id: 'second-inline-id' } } },
      services
    );

    expect(first.dataView.id).toBe('first-inline-id');
    expect(second.dataView.id).toBe('second-inline-id');
  });

  it('resolves saved Data View references without assigning an inline ID', async () => {
    const initialState = { serializedSearchSource: { index: 'saved-data-view' } };
    const first = await initialize(initialState);
    const reloaded = await initialize(initialState);

    expect(first.dataView.id).toBe('saved-data-view');
    expect(reloaded.dataView.id).toBe('saved-data-view');
    expect(reloaded.dataView.isPersisted()).toBe(true);
  });

  it.each<[string, SearchEmbeddableSerializedAttributes]>([
    [
      'an ES|QL query',
      { serializedSearchSource: { index: { title: 'logs-*' }, query: { esql: 'FROM logs-*' } } },
    ],
    [
      'an ES|QL Data View type',
      { serializedSearchSource: { index: { title: 'logs-*', type: ESQL_TYPE } } },
    ],
  ])('does not assign classic inline IDs for %s', async (_description, initialState) => {
    const services = createServices();
    services.cps = undefined;
    const createDataView = jest.spyOn(services.dataViews, 'create');

    const { dataView } = await initialize(initialState, services);

    expect(createDataView).toHaveBeenCalledWith(initialState.serializedSearchSource?.index);
    expect(dataView.id).not.toMatch(/^discover-inline-/);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { toStoredFilters } from '@kbn/as-code-filters-transforms';
import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import type { Filter } from '@kbn/es-query';
import { BooleanRelation, buildCombinedFilter, FilterStateStore } from '@kbn/es-query';
import { cloneDeep } from 'lodash';
import { createDataViewDataSource, createEsqlDataSource } from '../data_sources';
import { generateInlineDataViewId } from './inline_data_view';
import {
  createFilter,
  createFilterWithIndex,
  foreignFilter,
  unreferencedFilter,
} from './inline_data_view.fixtures';
import {
  bindUnreferencedAppFilters,
  getInlineDataViewIdentity,
  normalizeInlineAppState,
  normalizeInlineSearchSource,
  remapDataViewReferences,
  remapFilterDataViewIds,
} from './inline_data_view_references';

const inlineDataView: DataViewSpec = { title: 'logs-*', timeFieldName: '@timestamp' };
const inlineDataViewId = generateInlineDataViewId(inlineDataView);

const pinnedFilter: Filter = {
  ...unreferencedFilter,
  $state: { store: FilterStateStore.GLOBAL_STATE },
};

describe('getInlineDataViewIdentity', () => {
  it('returns the inline view with the ID derived from its spec', () => {
    const dataView = { ...inlineDataView, id: 'legacy-id' };

    expect(getInlineDataViewIdentity({ index: dataView })).toEqual({
      dataView,
      id: inlineDataViewId,
    });
  });
});

describe('remapFilterDataViewIds', () => {
  const idMap = new Map([['legacy-id', inlineDataViewId]]);

  it('replaces exact references, including those nested in combined filters', () => {
    const filters = [
      buildCombinedFilter(
        BooleanRelation.OR,
        [createFilter('legacy-id'), foreignFilter, unreferencedFilter],
        { id: 'legacy-id' }
      ),
      createFilter('legacy-id'),
    ];

    expect(remapFilterDataViewIds(filters, idMap)).toEqual([
      buildCombinedFilter(
        BooleanRelation.OR,
        [createFilter(inlineDataViewId), foreignFilter, unreferencedFilter],
        { id: inlineDataViewId }
      ),
      createFilter(inlineDataViewId),
    ]);
  });

  it('returns the same filters when nothing refers to a translated ID', () => {
    const filters = [foreignFilter, unreferencedFilter];

    expect(remapFilterDataViewIds(filters, idMap)).toBe(filters);
  });

  it('translates pinned filters, including nested ones, with their own map', () => {
    const pinnedCombinedFilter: Filter = {
      ...buildCombinedFilter(BooleanRelation.OR, [createFilter('legacy-id')], { id: 'legacy-id' }),
      $state: { store: FilterStateStore.GLOBAL_STATE },
    };
    const filters = [createFilter('legacy-id'), pinnedCombinedFilter];

    expect(remapFilterDataViewIds(filters, idMap, new Map())).toEqual([
      createFilter(inlineDataViewId),
      pinnedCombinedFilter,
    ]);
  });
});

describe('bindUnreferencedAppFilters', () => {
  it('binds app filters without a reference and keeps pinned and explicit references', () => {
    expect(
      bindUnreferencedAppFilters([unreferencedFilter, pinnedFilter, foreignFilter], 'view-id')
    ).toEqual([createFilterWithIndex(unreferencedFilter, 'view-id'), pinnedFilter, foreignFilter]);
  });

  it.each([undefined, 'view-id'])('binds nested filters when the group ID is %s', (id) => {
    const foreignGroup = buildCombinedFilter(
      BooleanRelation.OR,
      [unreferencedFilter, foreignFilter],
      { id: 'foreign-data-view-id' }
    );
    const filters = [
      buildCombinedFilter(BooleanRelation.AND, [unreferencedFilter, foreignGroup], { id }),
    ];
    const original = cloneDeep(filters);
    const boundFilters = bindUnreferencedAppFilters(filters, 'view-id');

    expect(boundFilters).toEqual([
      buildCombinedFilter(
        BooleanRelation.AND,
        [
          createFilterWithIndex(unreferencedFilter, 'view-id'),
          buildCombinedFilter(
            BooleanRelation.OR,
            [createFilterWithIndex(unreferencedFilter, 'foreign-data-view-id'), foreignFilter],
            { id: 'foreign-data-view-id' }
          ),
        ],
        { id: 'view-id' }
      ),
    ]);
    expect(filters).toEqual(original);
    expect(bindUnreferencedAppFilters(boundFilters, 'view-id')).toBe(boundFilters);
  });

  it('returns the same filters when there is nothing to bind', () => {
    const pinnedGroup = {
      ...buildCombinedFilter(BooleanRelation.OR, [unreferencedFilter], { id: undefined }),
      $state: { store: FilterStateStore.GLOBAL_STATE },
    };
    const filters = [pinnedFilter, foreignFilter, pinnedGroup];

    expect(bindUnreferencedAppFilters(filters, 'view-id')).toBe(filters);
  });
});

describe('remapDataViewReferences', () => {
  const idMap = new Map([['legacy-id', inlineDataViewId]]);

  it('translates the data source and filters without changing other app state', () => {
    const appState = {
      columns: ['message'],
      dataSource: createDataViewDataSource({ dataViewId: 'legacy-id' }),
      filters: [createFilter('legacy-id'), foreignFilter],
    };

    expect(remapDataViewReferences(appState, idMap)).toStrictEqual({
      columns: ['message'],
      dataSource: createDataViewDataSource({ dataViewId: inlineDataViewId }),
      filters: [createFilter(inlineDataViewId), foreignFilter],
    });
  });

  it('returns the same app state when nothing refers to a translated ID', () => {
    const appState = {
      dataSource: createDataViewDataSource({ dataViewId: 'saved-data-view' }),
      filters: [foreignFilter],
    };

    expect(remapDataViewReferences(appState, idMap)).toBe(appState);
  });
});

describe('normalizeInlineAppState', () => {
  const documentSearchSource = { index: { title: 'original-*' } };
  const searchSource = { index: { ...inlineDataView, id: 'local-id' } };

  it('inherits the document convention while keeping the local view and pinned filters', () => {
    const appState = {
      dataSource: createDataViewDataSource({ dataViewId: 'local-id' }),
      filters: [unreferencedFilter, pinnedFilter, foreignFilter],
    };

    expect(
      normalizeInlineAppState(appState, {
        searchSource,
        documentSearchSource,
        sharedIdMap: new Map(),
      })
    ).toStrictEqual({
      dataSource: createDataViewDataSource({ dataViewId: inlineDataViewId }),
      filters: [
        createFilterWithIndex(unreferencedFilter, inlineDataViewId),
        pinnedFilter,
        foreignFilter,
      ],
    });
  });

  it.each([createDataViewDataSource({ dataViewId: 'another-view' }), createEsqlDataSource()])(
    'does not bind filters belonging to another data source: %j',
    (dataSource) => {
      const appState = { dataSource, filters: [unreferencedFilter] };

      expect(
        normalizeInlineAppState(appState, {
          searchSource,
          documentSearchSource,
          sharedIdMap: new Map(),
        })
      ).toBe(appState);
    }
  );

  it('uses an ID-less local view when the document does not supply the API convention', () => {
    const appState = { filters: [unreferencedFilter] };

    expect(
      normalizeInlineAppState(appState, {
        searchSource: { index: inlineDataView },
        documentSearchSource: { index: { ...documentSearchSource.index, id: 'saved-id' } },
        sharedIdMap: new Map(),
      })
    ).toStrictEqual({ filters: [createFilterWithIndex(unreferencedFilter, inlineDataViewId)] });
  });
});

describe('normalizeInlineSearchSource', () => {
  const searchSource = {
    index: { ...inlineDataView, id: 'legacy-id' },
    filter: [createFilter('legacy-id'), unreferencedFilter],
  };

  it('normalizes an API group like the same group with explicit legacy references', () => {
    const filters: Parameters<typeof toStoredFilters>[0] = [
      {
        type: 'group',
        group: {
          operator: 'or',
          conditions: [
            { field: 'status', operator: 'is', value: '500' },
            { field: 'status', operator: 'is', value: '503' },
          ],
        },
      },
    ];
    const apiSource = { index: inlineDataView, filter: toStoredFilters(filters) };
    const legacySource = {
      index: { ...inlineDataView, id: 'legacy-id' },
      filter: toStoredFilters(filters.map((filter) => ({ ...filter, data_view_id: 'legacy-id' }))),
    };

    expect(normalizeInlineSearchSource(apiSource, { sharedIdMap: new Map() })).toStrictEqual(
      normalizeInlineSearchSource(legacySource, { sharedIdMap: new Map() })
    );
  });

  it('derives the identity and remaps own references without binding unreferenced CM filters', () => {
    const input = cloneDeep(searchSource);

    const normalized = normalizeInlineSearchSource(input, { sharedIdMap: new Map() });

    expect(normalized).toStrictEqual({
      index: { ...inlineDataView, id: inlineDataViewId },
      filter: [createFilter(inlineDataViewId), unreferencedFilter],
    });
    expect(input).toStrictEqual(searchSource);
  });

  it('binds unreferenced app filters of an ID-less spec without binding pinned filters', () => {
    const input = {
      index: inlineDataView,
      filter: [unreferencedFilter, pinnedFilter, foreignFilter],
    };
    const normalized = normalizeInlineSearchSource(input, { sharedIdMap: new Map() });

    expect(normalized).toStrictEqual({
      index: { ...inlineDataView, id: inlineDataViewId },
      filter: [
        createFilterWithIndex(unreferencedFilter, inlineDataViewId),
        pinnedFilter,
        foreignFilter,
      ],
    });
    expect(normalizeInlineSearchSource(normalized, { sharedIdMap: new Map() })).toBe(normalized);
  });

  it('uses the supplied shared map for pinned references', () => {
    const pinnedLegacyFilter: Filter = {
      ...createFilter('legacy-id'),
      $state: { store: FilterStateStore.GLOBAL_STATE },
    };
    const input = { ...searchSource, filter: [createFilter('legacy-id'), pinnedLegacyFilter] };

    expect(normalizeInlineSearchSource(input, { sharedIdMap: new Map() }).filter).toStrictEqual([
      createFilter(inlineDataViewId),
      pinnedLegacyFilter,
    ]);
    expect(
      normalizeInlineSearchSource(input, {
        sharedIdMap: new Map([['legacy-id', inlineDataViewId]]),
      }).filter
    ).toStrictEqual([
      createFilter(inlineDataViewId),
      createFilterWithIndex(pinnedLegacyFilter, inlineDataViewId),
    ]);
  });

  it('normalizes a restored copy completely using its associated ID-less document', () => {
    const input = { ...searchSource, filter: [unreferencedFilter, pinnedFilter] };

    expect(
      normalizeInlineSearchSource(input, {
        sharedIdMap: new Map(),
        documentSearchSource: { index: { title: 'original-*' } },
      })
    ).toStrictEqual({
      index: { ...inlineDataView, id: inlineDataViewId },
      filter: [createFilterWithIndex(unreferencedFilter, inlineDataViewId), pinnedFilter],
    });
  });

  it.each<[string, SerializedSearchSourceFields]>([
    ['persisted', { index: 'saved-view-id' }],
    ['managed', { index: { ...inlineDataView, managed: true } }],
    ['ES|QL', { index: inlineDataView, query: { esql: 'FROM logs-*' } }],
  ])('keeps the %s source while remapping references to other inline views', (_, source) => {
    const input = { ...source, filter: [createFilter('legacy-id'), unreferencedFilter] };

    expect(
      normalizeInlineSearchSource(input, {
        sharedIdMap: new Map([['legacy-id', inlineDataViewId]]),
      })
    ).toStrictEqual({
      ...source,
      filter: [createFilter(inlineDataViewId), unreferencedFilter],
    });
    expect(normalizeInlineSearchSource(input, { sharedIdMap: new Map() })).toBe(input);
  });

  it('returns the same search source when it is already normalized', () => {
    const normalizedSearchSource = {
      index: { ...inlineDataView, id: inlineDataViewId },
      filter: [createFilter(inlineDataViewId)],
    };

    expect(normalizeInlineSearchSource(normalizedSearchSource, { sharedIdMap: new Map() })).toBe(
      normalizedSearchSource
    );
  });
});

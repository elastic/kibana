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
import type { Filter } from '@kbn/es-query';
import { BooleanRelation, buildCombinedFilter, FilterStateStore } from '@kbn/es-query';
import { cloneDeep } from 'lodash';
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
  normalizeInlineSearchSource,
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

describe('normalizeInlineSearchSource', () => {
  const searchSource = {
    index: { ...inlineDataView, id: 'legacy-id' },
    filter: [createFilter('legacy-id'), unreferencedFilter],
  };
  const identity = getInlineDataViewIdentity(searchSource);
  const ownDataViewIdMap = new Map([['legacy-id', inlineDataViewId]]);

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

    expect(
      normalizeInlineSearchSource({
        searchSource: apiSource,
        identity: getInlineDataViewIdentity(apiSource),
        ownDataViewIdMap: new Map(),
        dataViewIdMap: new Map(),
        bindUnreferencedFilters: true,
      })
    ).toEqual(
      normalizeInlineSearchSource({
        searchSource: legacySource,
        identity: getInlineDataViewIdentity(legacySource),
        ownDataViewIdMap,
        dataViewIdMap: new Map(),
        bindUnreferencedFilters: false,
      })
    );
  });

  it('assigns the derived ID and translates its own references', () => {
    const input = cloneDeep(searchSource);

    const normalized = normalizeInlineSearchSource({
      searchSource: input,
      identity,
      ownDataViewIdMap,
      dataViewIdMap: new Map(),
      bindUnreferencedFilters: false,
    });

    expect(normalized).toEqual({
      index: { ...inlineDataView, id: inlineDataViewId },
      filter: [createFilter(inlineDataViewId), unreferencedFilter],
    });
    expect(input).toEqual(searchSource);
  });

  it('binds unreferenced app filters only when requested', () => {
    const normalized = normalizeInlineSearchSource({
      searchSource,
      identity,
      ownDataViewIdMap,
      dataViewIdMap: new Map(),
      bindUnreferencedFilters: true,
    });

    expect(normalized.filter).toEqual([
      createFilter(inlineDataViewId),
      createFilterWithIndex(unreferencedFilter, inlineDataViewId),
    ]);
  });

  it('uses the supplied shared map for pinned references', () => {
    const pinnedLegacyFilter: Filter = {
      ...createFilter('legacy-id'),
      $state: { store: FilterStateStore.GLOBAL_STATE },
    };
    const input = { ...searchSource, filter: [createFilter('legacy-id'), pinnedLegacyFilter] };
    const normalize = (dataViewIdMap: Map<string, string>) =>
      normalizeInlineSearchSource({
        searchSource: input,
        identity,
        ownDataViewIdMap,
        dataViewIdMap,
        bindUnreferencedFilters: false,
      });

    expect(normalize(new Map()).filter).toEqual([
      createFilter(inlineDataViewId),
      pinnedLegacyFilter,
    ]);
    expect(normalize(new Map([['legacy-id', inlineDataViewId]])).filter).toEqual([
      createFilter(inlineDataViewId),
      createFilterWithIndex(pinnedLegacyFilter, inlineDataViewId),
    ]);
  });

  it('returns the same search source when it is already normalized', () => {
    const normalizedSearchSource = {
      index: { ...inlineDataView, id: inlineDataViewId },
      filter: [createFilter(inlineDataViewId)],
    };
    const normalizedIdentity = getInlineDataViewIdentity(normalizedSearchSource);

    expect(
      normalizeInlineSearchSource({
        searchSource: normalizedSearchSource,
        identity: normalizedIdentity,
        ownDataViewIdMap: new Map(),
        dataViewIdMap: new Map(),
        bindUnreferencedFilters: true,
      })
    ).toBe(normalizedSearchSource);
  });
});

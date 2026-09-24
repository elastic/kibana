/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
import { BooleanRelation, buildCombinedFilter, FilterStateStore } from '@kbn/es-query';
import { cloneDeep } from 'lodash';
import { generateInlineDataViewId } from './inline_data_view';
import {
  bindUnreferencedAppFilters,
  createInlineDataViewIdMap,
  getInlineDataViewIdentity,
  normalizeInlineSearchSource,
  translateFilterDataViewIds,
  withOwnInlineDataViewId,
} from './inline_data_view_references';

const inlineDataView: DataViewSpec = { title: 'logs-*', timeFieldName: '@timestamp' };
const otherDataView: DataViewSpec = { title: 'metrics-*' };
const inlineDataViewId = generateInlineDataViewId(inlineDataView);
const otherDataViewId = generateInlineDataViewId(otherDataView);

const unreferencedFilter: Filter = { meta: {}, query: { match_all: {} } };
const foreignFilter: Filter = {
  meta: { index: 'foreign-data-view-id' },
  query: { term: { 'service.name': 'api' } },
};
const pinnedFilter: Filter = {
  ...unreferencedFilter,
  $state: { store: FilterStateStore.GLOBAL_STATE },
};

const createFilter = (dataViewId: string | undefined): Filter => ({
  meta: { index: dataViewId },
  query: { match_phrase: { 'service.name': 'checkout' } },
});

const createFilterWithIndex = (filter: Filter, index: string): Filter => ({
  ...filter,
  meta: { ...filter.meta, index },
});

describe('getInlineDataViewIdentity', () => {
  it('returns the inline view with the ID derived from its spec', () => {
    const dataView = { ...inlineDataView, id: 'legacy-id' };

    expect(getInlineDataViewIdentity({ index: dataView })).toEqual({
      dataView,
      id: inlineDataViewId,
    });
  });

  it('ignores referenced Data Views', () => {
    expect(getInlineDataViewIdentity({ index: 'saved-data-view' })).toBeUndefined();
  });
});

describe('createInlineDataViewIdMap', () => {
  it('maps each previous ID that refers to a single spec', () => {
    const idMap = createInlineDataViewIdMap([
      getInlineDataViewIdentity({ index: { ...inlineDataView, id: 'first-id' } }),
      getInlineDataViewIdentity({ index: { ...inlineDataView, id: 'second-id' } }),
      getInlineDataViewIdentity({ index: inlineDataView }),
      undefined,
    ]);

    expect(Object.fromEntries(idMap)).toEqual({
      'first-id': inlineDataViewId,
      'second-id': inlineDataViewId,
    });
  });

  it('leaves out previous IDs that refer to different specs', () => {
    const idMap = createInlineDataViewIdMap([
      getInlineDataViewIdentity({ index: { ...inlineDataView, id: 'shared-id' } }),
      getInlineDataViewIdentity({ index: { ...otherDataView, id: 'shared-id' } }),
    ]);

    expect(idMap.size).toBe(0);
  });

  it('treats a derived ID used by another spec as ambiguous', () => {
    const idMap = createInlineDataViewIdMap([
      getInlineDataViewIdentity({ index: { ...inlineDataView, id: inlineDataViewId } }),
      getInlineDataViewIdentity({ index: { ...otherDataView, id: inlineDataViewId } }),
    ]);

    expect(idMap.has(inlineDataViewId)).toBe(false);
  });
});

describe('withOwnInlineDataViewId', () => {
  it('adds the own previous ID even when it is ambiguous elsewhere', () => {
    const identity = getInlineDataViewIdentity({ index: { ...otherDataView, id: 'shared-id' } });

    expect(withOwnInlineDataViewId(identity, new Map()).get('shared-id')).toBe(otherDataViewId);
  });

  it('returns the same map when the representation has no previous ID', () => {
    const idMap = new Map([['legacy-id', inlineDataViewId]]);
    const identity = getInlineDataViewIdentity({ index: inlineDataView });

    expect(withOwnInlineDataViewId(identity, idMap)).toBe(idMap);
  });
});

describe('translateFilterDataViewIds', () => {
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

    expect(translateFilterDataViewIds(filters, idMap)).toEqual([
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

    expect(translateFilterDataViewIds(filters, idMap)).toBe(filters);
  });

  it('translates pinned filters, including nested ones, with their own map', () => {
    const pinnedCombinedFilter: Filter = {
      ...buildCombinedFilter(BooleanRelation.OR, [createFilter('legacy-id')], { id: 'legacy-id' }),
      $state: { store: FilterStateStore.GLOBAL_STATE },
    };
    const filters = [createFilter('legacy-id'), pinnedCombinedFilter];

    expect(translateFilterDataViewIds(filters, idMap, new Map())).toEqual([
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

  it('returns the same filters when there is nothing to bind', () => {
    const filters = [pinnedFilter, foreignFilter];

    expect(bindUnreferencedAppFilters(filters, 'view-id')).toBe(filters);
  });
});

describe('normalizeInlineSearchSource', () => {
  const searchSource = {
    index: { ...inlineDataView, id: 'legacy-id' },
    filter: [createFilter('legacy-id'), unreferencedFilter],
  };
  const identity = getInlineDataViewIdentity(searchSource);

  it('assigns the derived ID and translates its own references', () => {
    const input = cloneDeep(searchSource);

    const normalized = normalizeInlineSearchSource({
      searchSource: input,
      identity,
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
      dataViewIdMap: new Map(),
      bindUnreferencedFilters: true,
    });

    expect(normalized.filter).toEqual([
      createFilter(inlineDataViewId),
      createFilterWithIndex(unreferencedFilter, inlineDataViewId),
    ]);
  });

  it('translates pinned filters only with previous IDs that refer to a single spec', () => {
    const pinnedLegacyFilter: Filter = {
      ...createFilter('legacy-id'),
      $state: { store: FilterStateStore.GLOBAL_STATE },
    };
    const input = { ...searchSource, filter: [createFilter('legacy-id'), pinnedLegacyFilter] };
    const normalize = (dataViewIdMap: Map<string, string>) =>
      normalizeInlineSearchSource({
        searchSource: input,
        identity,
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
        dataViewIdMap: new Map(),
        bindUnreferencedFilters: true,
      })
    ).toBe(normalizedSearchSource);
  });
});

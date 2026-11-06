/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { discoverSessionApiDataSchema } from '@kbn/as-code-discover-schema';
import { injectReferences, parseSearchSourceJSON } from '@kbn/data-plugin/common';
import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { BooleanRelation, FILTERS, isCombinedFilter } from '@kbn/es-query';
import type { CombinedFilter, Filter } from '@kbn/es-query';
import type { DiscoverSessionAttributes } from '@kbn/saved-search-plugin/server';
import { assignStoredInlineDataViewIds } from './assign_stored_inline_data_view_ids';
import { transformDiscoverSessionIn } from './transform_discover_session_in';
import { transformDiscoverSessionOut } from './transform_discover_session_out';
import { discoverSessionAttributes } from './transform_discover_session.fixtures';

const inlineSpec: DataViewSpec = { title: 'logs-*' };
const createAttributes = (
  tabs: Array<{ id: string; searchSource: SerializedSearchSourceFields }>
): DiscoverSessionAttributes => ({
  title: 'Inline session',
  description: '',
  tabs: tabs.map(({ id, searchSource }) => ({
    id,
    label: id,
    attributes: {
      ...discoverSessionAttributes.tabs[0].attributes,
      kibanaSavedObjectMeta: { searchSourceJSON: JSON.stringify(searchSource) },
    },
  })),
});

const readSearchSource = (attributes: DiscoverSessionAttributes, tabIndex = 0) =>
  parseSearchSourceJSON(
    attributes.tabs[tabIndex].attributes.kibanaSavedObjectMeta.searchSourceJSON
  );

const readInlineId = (attributes: DiscoverSessionAttributes, tabIndex = 0) => {
  const { index } = readSearchSource(attributes, tabIndex);
  if (!index || typeof index === 'string') {
    throw new Error('Expected an inline Data View');
  }
  return index.id;
};

describe('assignStoredInlineDataViewIds', () => {
  it('shares IDs for equivalent new views while keeping different definitions separate', () => {
    const metricsSpec = { title: 'metrics-*' };
    const input = createAttributes([
      { id: 'logs', searchSource: { index: inlineSpec } },
      { id: 'metrics', searchSource: { index: metricsSpec } },
      {
        id: 'logs-copy',
        searchSource: { index: { ...inlineSpec, name: 'logs-*', allowHidden: false } },
      },
      { id: 'metrics-copy', searchSource: { index: metricsSpec } },
      { id: 'logs-second-copy', searchSource: { index: inlineSpec } },
    ]);
    const before = JSON.stringify(input);

    const result = assignStoredInlineDataViewIds(input);
    const logsId = readInlineId(result);
    const metricsId = readInlineId(result, 1);

    expect(logsId).toStrictEqual(expect.any(String));
    expect(metricsId).toStrictEqual(expect.any(String));
    expect(metricsId).not.toBe(logsId);
    expect(result.tabs.map((_, tabIndex) => readInlineId(result, tabIndex))).toStrictEqual([
      logsId,
      metricsId,
      logsId,
      metricsId,
      logsId,
    ]);
    expect(result.tabs.map(({ id }) => id)).toStrictEqual(input.tabs.map(({ id }) => id));
    expect(JSON.stringify(input)).toBe(before);
    expect(assignStoredInlineDataViewIds(result)).toStrictEqual(result);
  });

  it('shares matching stored views without IDs and keeps their assigned IDs on later updates', () => {
    const attributes = createAttributes([
      { id: 'first', searchSource: { index: inlineSpec } },
      {
        id: 'second',
        searchSource: { index: { ...inlineSpec, name: 'logs-*', allowHidden: false } },
      },
      { id: 'different', searchSource: { index: { title: 'metrics-*' } } },
    ]);
    const before = JSON.stringify(attributes);

    const result = assignStoredInlineDataViewIds(attributes, attributes);
    const sharedId = readInlineId(result);
    const differentId = readInlineId(result, 2);

    expect(sharedId).toStrictEqual(expect.any(String));
    expect(readInlineId(result, 1)).toBe(sharedId);
    expect(differentId).toStrictEqual(expect.any(String));
    expect(differentId).not.toBe(sharedId);
    expect(JSON.stringify(attributes)).toBe(before);
    expect(assignStoredInlineDataViewIds(attributes, result)).toStrictEqual(result);
  });

  it.each([
    { source: 'inline without an ID', searchSource: { index: inlineSpec } },
    { source: 'saved Data View', searchSource: { indexRefName: 'saved-view-reference' } },
    {
      source: 'ES|QL',
      searchSource: {
        query: { esql: 'FROM logs-*' },
        index: { ...inlineSpec, id: 'esql-id' },
      },
    },
  ])(
    'reuses a matching inline ID for an existing tab previously using $source',
    ({ searchSource }) => {
      const existing = createAttributes([
        { id: 'updated', searchSource },
        { id: 'unchanged', searchSource: { index: { ...inlineSpec, id: 'shared-id' } } },
      ]);
      const input = createAttributes([
        { id: 'updated', searchSource: { index: inlineSpec } },
        { id: 'unchanged', searchSource: { index: inlineSpec } },
      ]);
      const before = JSON.stringify({ input, existing });

      const result = assignStoredInlineDataViewIds(input, existing);

      expect(readInlineId(result)).toBe('shared-id');
      expect(readInlineId(result, 1)).toBe('shared-id');
      expect(JSON.stringify({ input, existing })).toBe(before);
    }
  );

  it.each<Omit<SerializedSearchSourceFields, 'index'> & { index: DataViewSpec }>([
    { index: inlineSpec },
    { index: inlineSpec, query: { language: 'kuery', query: 'bytes > 100' } },
    {
      index: {
        ...inlineSpec,
        name: 'logs-*',
        allowHidden: false,
        sourceFilters: [],
        runtimeFieldMap: {},
        fieldFormats: {},
        fieldAttrs: { bytes: { count: 5 } },
      },
    },
  ])('keeps the stored ID when only query or omitted defaults differ: %j', (searchSource) => {
    const existing = createAttributes([
      { id: 'tab', searchSource: { index: { ...inlineSpec, id: 'legacy-id' } } },
    ]);
    const input = createAttributes([{ id: 'tab', searchSource }]);
    const before = JSON.stringify({ input, existing });
    const result = assignStoredInlineDataViewIds(input, existing);

    expect(readSearchSource(result)).toEqual({
      ...searchSource,
      index: { ...searchSource.index, id: 'legacy-id' },
    });
    expect(JSON.stringify({ input, existing })).toBe(before);
  });

  it.each<Partial<DataViewSpec>>([
    { title: 'other-*' },
    { name: 'Renamed' },
    { timeFieldName: '@timestamp' },
    { allowHidden: true },
    { sourceFilters: [{ value: 'a' }, { value: 'b' }, { value: 'secret.*' }] },
    { sourceFilters: [{ value: 'a' }] },
    { runtimeFieldMap: { bytes: { type: 'long', script: { source: 'emit(42)' } } } },
    { fieldFormats: { bytes: { id: 'bytes' } } },
    { fieldAttrs: { bytes: { customLabel: 'Size' } } },
  ])('assigns a new ID for a changed definition: %j', (changes) => {
    const previousSpec = { ...inlineSpec, sourceFilters: [{ value: 'a' }, { value: 'b' }] };
    const existing = createAttributes([
      { id: 'tab', searchSource: { index: { ...previousSpec, id: 'legacy-id' } } },
    ]);
    const input = createAttributes([
      { id: 'tab', searchSource: { index: { ...previousSpec, ...changes } } },
    ]);
    const result = assignStoredInlineDataViewIds(input, existing);

    expect(readInlineId(result)).toEqual(expect.any(String));
    expect(readInlineId(result)).not.toBe('legacy-id');
  });

  it('keeps the ID and submitted order when field exclusions are reordered', () => {
    const previousSpec = {
      ...inlineSpec,
      id: 'legacy-id',
      sourceFilters: [{ value: 'a' }, { value: 'b' }],
    };
    const existing = createAttributes([{ id: 'tab', searchSource: { index: previousSpec } }]);
    const sourceFilters = [{ value: 'b' }, { value: 'a' }];
    const input = createAttributes([
      { id: 'tab', searchSource: { index: { ...inlineSpec, sourceFilters } } },
    ]);
    const before = JSON.stringify({ input, existing });

    const result = assignStoredInlineDataViewIds(input, existing);

    expect(readSearchSource(result).index).toEqual({ ...previousSpec, sourceFilters });
    expect(JSON.stringify({ input, existing })).toBe(before);
  });

  it.each([
    {
      tabIds: ['new', 'duplicate', 'second', 'first'],
      expectedIds: ['shared-id', 'shared-id', 'independent-id', 'shared-id'],
    },
    {
      tabIds: ['new', 'second', 'first', 'duplicate'],
      expectedIds: ['independent-id', 'independent-id', 'shared-id', 'shared-id'],
    },
  ])(
    'preserves existing IDs and reuses the first matching view for new tabs: $tabIds',
    ({ tabIds, expectedIds }) => {
      const existing = createAttributes([
        { id: 'first', searchSource: { index: { ...inlineSpec, id: 'shared-id' } } },
        { id: 'second', searchSource: { index: { ...inlineSpec, id: 'independent-id' } } },
        { id: 'duplicate', searchSource: { index: { ...inlineSpec, id: 'shared-id' } } },
      ]);
      const input = createAttributes(
        tabIds.map((id) => ({
          id,
          searchSource: { index: inlineSpec },
        }))
      );
      const result = assignStoredInlineDataViewIds(input, existing);

      expect(result.tabs.map((_, tabIndex) => readInlineId(result, tabIndex))).toStrictEqual(
        expectedIds
      );
      expect(result.tabs.map(({ id }) => id)).toStrictEqual(tabIds);
    }
  );

  it.each([{ tabIds: ['copy', 'original'] }, { tabIds: ['original', 'copy'] }])(
    'shares an edited view with its new copy regardless of tab order: $tabIds',
    ({ tabIds }) => {
      const existing = createAttributes([
        { id: 'original', searchSource: { index: { ...inlineSpec, id: 'previous-id' } } },
      ]);
      const input = createAttributes(
        tabIds.map((id) => ({ id, searchSource: { index: { title: 'other-*' } } }))
      );
      const before = JSON.stringify({ input, existing });

      const result = assignStoredInlineDataViewIds(input, existing);
      const newId = readInlineId(result);

      expect(newId).toStrictEqual(expect.any(String));
      expect(newId).not.toBe('previous-id');
      expect(result.tabs.map((_, tabIndex) => readInlineId(result, tabIndex))).toStrictEqual([
        newId,
        newId,
      ]);
      expect(result.tabs.map(({ id }) => id)).toStrictEqual(tabIds);
      expect(JSON.stringify({ input, existing })).toBe(before);
    }
  );

  it('gives an edited tab a new ID even when its new definition matches another tab', () => {
    const otherSpec = { title: 'other-*' };
    const existing = createAttributes([
      { id: 'unchanged', searchSource: { index: { ...otherSpec, id: 'other-id' } } },
      { id: 'edited', searchSource: { index: { ...inlineSpec, id: 'previous-id' } } },
    ]);
    const input = createAttributes(
      ['unchanged', 'edited'].map((id) => ({ id, searchSource: { index: otherSpec } }))
    );

    const result = assignStoredInlineDataViewIds(input, existing);
    const editedId = readInlineId(result, 1);

    expect(readInlineId(result)).toBe('other-id');
    expect(editedId).toStrictEqual(expect.any(String));
    expect(['other-id', 'previous-id']).not.toContain(editedId);
  });

  it('binds implicit nested filters without changing their content or explicit references', () => {
    const implicit: Filter = { meta: { type: FILTERS.CUSTOM }, query: { term: { bytes: 42 } } };
    const foreign = { ...implicit, meta: { ...implicit.meta, index: 'other-view' } };
    const reference = { ...implicit, meta: { ...implicit.meta, indexRefName: 'other-reference' } };
    const nested: CombinedFilter = {
      meta: { type: FILTERS.COMBINED, relation: BooleanRelation.OR, params: [implicit, foreign] },
    };
    const group: CombinedFilter = {
      meta: { type: FILTERS.COMBINED, relation: BooleanRelation.AND, params: [nested, reference] },
    };
    const input = createAttributes([
      { id: 'tab', searchSource: { index: inlineSpec, filter: [group] } },
    ]);
    const result = assignStoredInlineDataViewIds(input);
    const id = readInlineId(result);

    expect(readSearchSource(result).filter).toEqual([
      {
        meta: {
          ...group.meta,
          index: id,
          params: [
            {
              meta: {
                ...nested.meta,
                index: id,
                params: [{ ...implicit, meta: { ...implicit.meta, index: id } }, foreign],
              },
            },
            reference,
          ],
        },
      },
    ]);
    expect(readSearchSource(input).filter).toEqual([group]);
  });

  it('restores the inline ID after a public GET/PUT without rewriting foreign references', () => {
    const existing = createAttributes([
      {
        id: 'tab',
        searchSource: {
          index: { ...inlineSpec, id: 'legacy-id' },
          filter: ['legacy-id', 'other-view'].map((index) => ({
            meta: { type: FILTERS.CUSTOM, index },
            query: { term: { bytes: 42 } },
          })),
        },
      },
    ]);
    const publicData = transformDiscoverSessionOut(existing).sessionState;
    const { attributes, references } = transformDiscoverSessionIn(publicData);
    const result = assignStoredInlineDataViewIds(attributes, existing);
    const loaded = injectReferences(readSearchSource(result), references);

    expect(loaded.index).toEqual({ ...inlineSpec, id: 'legacy-id' });
    expect(loaded.filter?.map(({ meta }) => meta.index)).toEqual(['legacy-id', 'other-view']);
    expect(references.map(({ id }) => id)).toEqual(['other-view']);
    expect(transformDiscoverSessionOut(result, references).sessionState).toEqual(publicData);
    expect(readInlineId(existing)).toBe('legacy-id');
  });

  it('omits nested inline IDs on GET and binds the new ID after PUT changes the spec', () => {
    const group = {
      type: 'group',
      group: {
        operator: 'and',
        conditions: [
          { field: 'bytes', operator: 'exists' },
          {
            operator: 'or',
            conditions: [
              { field: 'host.name', operator: 'exists' },
              { field: 'response.status', operator: 'exists' },
            ],
          },
        ],
      },
    };
    const request = discoverSessionApiDataSchema.parse({
      title: 'Nested filters',
      tabs: [
        {
          id: 'tab',
          label: 'Logs',
          data_source: { type: 'data_view_spec', index_pattern: 'logs-*' },
          filters: [group],
        },
      ],
    });
    const getFilterIds = (filters: Filter[]): Array<string | undefined> =>
      filters.flatMap((filter) => [
        filter.meta.index,
        ...(isCombinedFilter(filter) ? getFilterIds(filter.meta.params) : []),
      ]);
    const stored = transformDiscoverSessionIn(request);
    const existing = assignStoredInlineDataViewIds(stored.attributes);
    const oldId = readInlineId(existing);

    expect(oldId).toEqual(expect.any(String));
    expect(getFilterIds(readSearchSource(existing).filter ?? [])).toEqual([
      oldId,
      oldId,
      oldId,
      oldId,
      oldId,
    ]);

    const publicData = transformDiscoverSessionOut(existing, stored.references).sessionState;
    const publicTab = publicData.tabs[0];
    if (!('filters' in publicTab)) {
      throw new Error('Expected a classic tab with filters');
    }
    expect(publicTab.filters).toEqual([group]);

    const changedRequest = discoverSessionApiDataSchema.parse({
      ...publicData,
      tabs: publicData.tabs.map((tab) => ({
        ...tab,
        data_source: { type: 'data_view_spec', index_pattern: 'other-logs-*' },
      })),
    });
    const updated = transformDiscoverSessionIn(changedRequest);
    const result = assignStoredInlineDataViewIds(updated.attributes, existing);
    const newId = readInlineId(result);
    const loaded = injectReferences(readSearchSource(result), updated.references);

    expect(newId).toEqual(expect.any(String));
    expect(newId).not.toBe(oldId);
    expect(getFilterIds(loaded.filter ?? [])).toEqual([newId, newId, newId, newId, newId]);
    expect(updated.references).toEqual([]);
    expect(transformDiscoverSessionOut(result, updated.references).sessionState).toEqual(
      changedRequest
    );
  });

  it('keeps the same ID through public GET/PUT with omitted or explicit defaults', () => {
    const existing = createAttributes([
      { id: 'tab', searchSource: { index: { ...inlineSpec, id: 'legacy-id' } } },
    ]);
    const publicData = transformDiscoverSessionOut(existing).sessionState;
    const withExplicitDefaults = {
      ...publicData,
      tabs: publicData.tabs.map((tab) => ({
        ...tab,
        data_source: {
          type: 'data_view_spec',
          index_pattern: 'logs-*',
          name: 'logs-*',
          allow_hidden_indices: false,
          field_settings: {},
          field_filters: [],
        },
      })),
    };

    for (const request of [publicData, withExplicitDefaults]) {
      const validated = discoverSessionApiDataSchema.parse(request);
      const { attributes } = transformDiscoverSessionIn(validated);
      const result = assignStoredInlineDataViewIds(attributes, existing);

      expect(readInlineId(result)).toBe('legacy-id');
    }
  });

  it('leaves saved Data Views and ES|QL tabs unchanged', () => {
    const input = createAttributes([
      { id: 'saved', searchSource: { index: 'saved-view' } },
      { id: 'esql', searchSource: { query: { esql: 'FROM logs-*' }, index: inlineSpec } },
      { id: 'esql-view', searchSource: { index: { ...inlineSpec, type: 'esql' } } },
    ]);
    const result = assignStoredInlineDataViewIds(input);

    expect(result).toEqual(input);
    result.tabs.forEach((tab, tabIndex) => expect(tab).toBe(input.tabs[tabIndex]));
  });
});

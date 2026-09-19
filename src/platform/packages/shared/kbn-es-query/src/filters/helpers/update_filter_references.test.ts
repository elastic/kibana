/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FilterStateStore } from '@kbn/es-query-constants';
import { cloneDeep } from 'lodash';
import type { Filter } from '../build_filters';
import { BooleanRelation, buildCombinedFilter } from '../build_filters';
import { updateFilterReferences } from './update_filter_references';

describe('updateFilterReferences', () => {
  it.each([
    { action: 'updates', toDataView: 'new-id' },
    { action: 'removes', toDataView: undefined },
  ])('$action the old data view ID and leaves other filters alone', ({ toDataView }) => {
    const filters: Filter[] = [
      {
        $state: { store: FilterStateStore.GLOBAL_STATE },
        meta: { index: 'old-id', disabled: true, negate: true, alias: 'My filter' },
        query: { term: { bytes: 100 } },
      },
      { meta: { index: 'foreign-id' }, query: { term: { bytes: 200 } } },
      { meta: {}, query: { term: { bytes: 300 } } },
    ];
    const originalFilters = cloneDeep(filters);
    const result = updateFilterReferences(filters, 'old-id', toDataView);

    expect(result).toStrictEqual([
      { ...filters[0], meta: { ...filters[0].meta, index: toDataView } },
      filters[1],
      filters[2],
    ]);
    expect(result[1]).toBe(filters[1]);
    expect(result[2]).toBe(filters[2]);
    expect(filters).toStrictEqual(originalFilters);
    expect(updateFilterReferences(result, 'old-id', toDataView)).toStrictEqual(result);
  });

  it.each([
    { parent: 'uses the old ID', parentId: 'old-id', expectedParentId: 'new-id' },
    { parent: 'uses another ID', parentId: 'foreign-id', expectedParentId: 'foreign-id' },
    { parent: 'has no ID', parentId: undefined, expectedParentId: undefined },
  ])('updates nested filters when the parent $parent', ({ parentId, expectedParentId }) => {
    const createFilter = (groupId: string | undefined, childId: string) => {
      const nestedGroup = buildCombinedFilter(
        BooleanRelation.OR,
        [
          { meta: { index: childId }, query: { term: { bytes: 300 } } },
          { meta: { index: 'foreign-id' }, query: { term: { bytes: 400 } } },
          { meta: {}, query: { term: { bytes: 500 } } },
        ],
        { id: 'foreign-id' }
      );

      return buildCombinedFilter(
        BooleanRelation.AND,
        [
          { meta: { index: childId }, query: { term: { bytes: 100 } } },
          { meta: {}, query: { term: { bytes: 200 } } },
          nestedGroup,
        ],
        { id: groupId },
        true,
        true,
        'Nested filter',
        FilterStateStore.GLOBAL_STATE
      );
    };
    const filters = [createFilter(parentId, 'old-id')];
    const originalFilters = cloneDeep(filters);
    const result = updateFilterReferences(filters, 'old-id', 'new-id');

    expect(result).toStrictEqual([createFilter(expectedParentId, 'new-id')]);
    expect(filters).toStrictEqual(originalFilters);
    expect(updateFilterReferences(result, 'old-id', 'new-id')).toStrictEqual(result);
  });

  it('leaves a group alone when neither the group nor its filters use the old ID', () => {
    const filter = buildCombinedFilter(
      BooleanRelation.AND,
      [
        { meta: {}, query: { term: { bytes: 100 } } },
        { meta: { index: 'foreign-id' }, query: { term: { bytes: 200 } } },
      ],
      { id: 'foreign-id' }
    );

    expect(updateFilterReferences([filter], 'old-id', 'new-id')[0]).toBe(filter);
  });

  it('returns an empty list when there are no filters', () => {
    expect(updateFilterReferences([], 'old-id', 'new-id')).toStrictEqual([]);
  });
});

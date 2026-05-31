/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsHitRecord } from '@kbn/discover-utils/types';
import {
  getEsHitRecordDedupKey,
  mergeEsHitPages,
  parseSearchTotalHits,
  resolveHitSearchHasMoreHits,
} from './workflow_execute_hit_search_pagination';

describe('workflow_execute_hit_search_pagination', () => {
  it('parseSearchTotalHits reads numeric and relation totals', () => {
    expect(parseSearchTotalHits(12)).toBe(12);
    expect(parseSearchTotalHits({ value: 99, relation: 'eq' })).toBe(99);
    expect(parseSearchTotalHits(undefined)).toBe(0);
  });

  it('mergeEsHitPages replaces on first page and appends on later pages', () => {
    const first: EsHitRecord[] = [{ _id: '1', _index: 'a', _source: {} }];
    const second: EsHitRecord[] = [{ _id: '2', _index: 'a', _source: {} }];
    expect(mergeEsHitPages(first, second, 0)).toEqual(second);
    expect(mergeEsHitPages(first, second, 1)).toEqual([...first, ...second]);
  });

  it('getEsHitRecordDedupKey uses index and id', () => {
    expect(getEsHitRecordDedupKey({ _id: '1', _index: '.alerts-default', _source: {} })).toBe(
      '.alerts-default::1'
    );
  });

  it('mergeEsHitPages keeps hits with the same id in different indices', () => {
    const first: EsHitRecord[] = [{ _id: '1', _index: 'logs-a', _source: {} }];
    const second: EsHitRecord[] = [{ _id: '1', _index: 'logs-b', _source: {} }];
    expect(mergeEsHitPages(first, second, 1)).toEqual([...first, ...second]);
  });

  it('resolveHitSearchHasMoreHits returns true when more hits exist', () => {
    expect(
      resolveHitSearchHasMoreHits({
        totalHits: 120,
        accumulatedHitsLength: 50,
        currentPageHitsLength: 50,
      })
    ).toBe(true);
  });
});

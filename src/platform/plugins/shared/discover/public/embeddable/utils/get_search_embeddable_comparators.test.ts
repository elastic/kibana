/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { runComparator } from '@kbn/presentation-publishing';
import {
  getDiscoverSessionEmbeddableComparators,
  getSearchEmbeddableComparators,
} from './get_search_embeddable_comparators';

const sharedSavedSearchComparators = {
  sort: 'deepEquality',
  columns: 'deepEquality',
  rowHeight: 'referenceEquality',
  sampleSize: 'referenceEquality',
  rowsPerPage: 'referenceEquality',
  headerRowHeight: 'referenceEquality',
  density: 'referenceEquality',
  grid: 'deepEquality',
} as const;

describe('getSearchEmbeddableComparators', () => {
  it('returns shared attribute comparators for by-value panels', () => {
    const c = getSearchEmbeddableComparators(true, false);
    expect(c).toMatchObject(sharedSavedSearchComparators);
    expect('attributes' in c && c.attributes).toBe('skip');
    expect(c).not.toHaveProperty('selectedTabId');
    expect(c).not.toHaveProperty('savedObjectId');
  });

  it('uses referenceEquality for selectedTabId when by-reference and tab comparators are active', () => {
    const c = getSearchEmbeddableComparators(false, false);
    expect(c).toMatchObject(sharedSavedSearchComparators);
    expect('selectedTabId' in c && c.selectedTabId).toBe('referenceEquality');
    expect('savedObjectId' in c && c.savedObjectId).toBe('skip');
    expect(c).not.toHaveProperty('attributes');
  });

  it('skips selectedTabId when by-reference and tab comparators should be skipped', () => {
    const c = getSearchEmbeddableComparators(false, true);
    expect(c).toMatchObject(sharedSavedSearchComparators);
    expect('selectedTabId' in c && c.selectedTabId).toBe('skip');
    expect('savedObjectId' in c && c.savedObjectId).toBe('skip');
  });

  it('treats selectedTabId as always equal when skipped (deleted tab / inline edit)', () => {
    const c = getSearchEmbeddableComparators(false, true);
    expect(
      'selectedTabId' in c && runComparator(c.selectedTabId, undefined, undefined, 'tab-a', 'tab-b')
    ).toBe(true);
  });

  it('compares selectedTabId by reference when not skipped', () => {
    const c = getSearchEmbeddableComparators(false, false);
    expect(
      'selectedTabId' in c && runComparator(c.selectedTabId, undefined, undefined, 'a', 'a')
    ).toBe(true);
    expect(
      'selectedTabId' in c && runComparator(c.selectedTabId, undefined, undefined, 'a', 'b')
    ).toBe(false);
  });
});

describe('getDiscoverSessionEmbeddableComparators', () => {
  it('returns only tabs comparator for by-value discover session panels', () => {
    const c = getDiscoverSessionEmbeddableComparators(true, false);
    expect(c).toEqual({ tabs: 'deepEquality' });
  });

  it('returns by-reference comparators when not by-value', () => {
    const c = getDiscoverSessionEmbeddableComparators(false, false);
    expect('discover_session_id' in c && c.discover_session_id).toBe('skip');
    expect('overrides' in c && c.overrides).toBe('deepEquality');
    expect('selected_tab_id' in c && c.selected_tab_id).toBe('referenceEquality');
  });

  it('skips selected_tab_id when tab comparators should be skipped', () => {
    const c = getDiscoverSessionEmbeddableComparators(false, true);
    expect('selected_tab_id' in c && c.selected_tab_id).toBe('skip');
    expect('discover_session_id' in c && c.discover_session_id).toBe('skip');
    expect('overrides' in c && c.overrides).toBe('deepEquality');
  });

  it('treats selected_tab_id as always equal when skipped', () => {
    const c = getDiscoverSessionEmbeddableComparators(false, true);
    expect(
      'selected_tab_id' in c &&
        runComparator(c.selected_tab_id, undefined, undefined, 'tab-a', 'tab-b')
    ).toBe(true);
  });

  it('compares selected_tab_id by reference when not skipped', () => {
    const c = getDiscoverSessionEmbeddableComparators(false, false);
    expect(
      'selected_tab_id' in c && runComparator(c.selected_tab_id, undefined, undefined, 'x', 'x')
    ).toBe(true);
    expect(
      'selected_tab_id' in c && runComparator(c.selected_tab_id, undefined, undefined, 'x', 'y')
    ).toBe(false);
  });
});

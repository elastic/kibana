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
import { AS_CODE_DATA_VIEW_REFERENCE_TYPE } from '@kbn/as-code-data-views-schema';
import { VIEW_MODE } from '@kbn/saved-search-plugin/common';

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
  const language = 'kql' as const;
  const baseTab = {
    query: { language, expression: '*' },
    filters: [],
    sort: [],
    column_order: [],
    header_row_height: 3,
    data_source: {
      type: AS_CODE_DATA_VIEW_REFERENCE_TYPE,
      ref_id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
    },
    view_mode: VIEW_MODE.DOCUMENT_LEVEL,
  };

  it('returns by-reference comparators when not by-value', () => {
    const c = getDiscoverSessionEmbeddableComparators(false, false);
    expect('ref_id' in c && c.ref_id).toBe('skip');
    expect('selected_tab_id' in c && c.selected_tab_id).toBe('referenceEquality');
    expect('overrides' in c && typeof c.overrides).toBe('function');
  });

  it('skips selected_tab_id when tab comparators should be skipped', () => {
    const c = getDiscoverSessionEmbeddableComparators(false, true);
    expect('ref_id' in c && c.ref_id).toBe('skip');
    expect('selected_tab_id' in c && c.selected_tab_id).toBe('skip');
    expect('overrides' in c && typeof c.overrides).toBe('function');
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

  describe('tabs comparator', () => {
    const getTabsComparator = () => {
      const c = getDiscoverSessionEmbeddableComparators(true, false);
      if (!('tabs' in c) || typeof c.tabs !== 'function') {
        throw new Error('expected tabs function comparator');
      }
      return c.tabs;
    };

    it('treats tab arrays as equal when each tab is deeply equal', () => {
      const cmp = getTabsComparator();
      const tab = { ...baseTab };
      expect(runComparator(cmp, undefined, undefined, [baseTab], [tab])).toBe(true);
    });

    it('treats omitted optional fields as equal to explicit undefined (e.g. query)', () => {
      const cmp = getTabsComparator();
      const { query, ...tabWithoutQuery } = baseTab;
      const tabA = { ...tabWithoutQuery };
      const tabB = { ...tabWithoutQuery, query: undefined };
      expect(runComparator(cmp, undefined, undefined, [tabA], [tabB])).toBe(true);
    });

    it('treats tab arrays as not equal when a tab differs', () => {
      const cmp = getTabsComparator();
      const tabA = { ...baseTab, query: { language, expression: 'a' } };
      const tabB = { ...baseTab, query: { language, expression: 'b' } };
      expect(runComparator(cmp, undefined, undefined, [tabA], [tabB])).toBe(false);
    });

    it('treats tab arrays as not equal when lengths differ', () => {
      const cmp = getTabsComparator();
      const tab = { ...baseTab };
      expect(runComparator(cmp, undefined, undefined, [tab], [tab, tab])).toBe(false);
    });
  });

  describe('overrides comparator', () => {
    const getOverridesComparator = () => {
      const c = getDiscoverSessionEmbeddableComparators(false, false);
      if (!('overrides' in c) || typeof c.overrides !== 'function') {
        throw new Error('expected overrides function comparator');
      }
      return c.overrides;
    };

    it('treats {} and { sort: [] } as equal (default sort is empty)', () => {
      const cmp = getOverridesComparator();
      expect(runComparator(cmp, undefined, undefined, {}, { sort: [] })).toBe(true);
      expect(runComparator(cmp, undefined, undefined, { sort: [] }, {})).toBe(true);
    });

    it('treats {} and { column_order: [] } as equal', () => {
      const cmp = getOverridesComparator();
      expect(runComparator(cmp, undefined, undefined, {}, { column_order: [] })).toBe(true);
    });

    it('treats {} and { column_settings: {} } as equal', () => {
      const cmp = getOverridesComparator();
      expect(runComparator(cmp, undefined, undefined, {}, { column_settings: {} })).toBe(true);
    });

    it('treats explicit defaults together as equal to {}', () => {
      const cmp = getOverridesComparator();
      expect(
        runComparator(
          cmp,
          undefined,
          undefined,
          {},
          { sort: [], column_order: [], column_settings: {} }
        )
      ).toBe(true);
    });

    it('detects different sort', () => {
      const cmp = getOverridesComparator();
      expect(
        runComparator(
          cmp,
          undefined,
          undefined,
          {},
          { sort: [{ name: '@timestamp', direction: 'desc' }] }
        )
      ).toBe(false);
      expect(
        runComparator(
          cmp,
          undefined,
          undefined,
          { sort: [] },
          { sort: [{ name: '@timestamp', direction: 'desc' }] }
        )
      ).toBe(false);
    });

    it('detects different column_order', () => {
      const cmp = getOverridesComparator();
      expect(
        runComparator(cmp, undefined, undefined, { column_order: ['a'] }, { column_order: ['b'] })
      ).toBe(false);
    });

    it('detects different column_settings', () => {
      const cmp = getOverridesComparator();
      expect(
        runComparator(
          cmp,
          undefined,
          undefined,
          { column_settings: { a: { width: 100 } } },
          { column_settings: { a: { width: 200 } } }
        )
      ).toBe(false);
    });

    it('compares other override keys with deep equality', () => {
      const cmp = getOverridesComparator();
      expect(
        runComparator(cmp, undefined, undefined, { sample_size: 500 }, { sample_size: 500 })
      ).toBe(true);
      expect(
        runComparator(cmp, undefined, undefined, { sample_size: 500 }, { sample_size: 100 })
      ).toBe(false);
    });

    it('treats undefined overrides as {}', () => {
      const cmp = getOverridesComparator();
      expect(runComparator(cmp, undefined, undefined, undefined, { sort: [] })).toBe(true);
      expect(runComparator(cmp, undefined, undefined, { sort: [] }, undefined)).toBe(true);
    });
  });
});

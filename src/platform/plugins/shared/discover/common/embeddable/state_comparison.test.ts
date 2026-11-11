/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { areComparatorsEqual, runComparator } from '@kbn/presentation-publishing';
import { discoverSessionEmbeddableStateComparison } from './state_comparison';
import type { DiscoverSessionEmbeddableState } from './types';
import { AS_CODE_DATA_VIEW_REFERENCE_TYPE } from '@kbn/as-code-data-views-schema';
import { DiscoverTabType } from '@kbn/discover-session-constants';
import { VIEW_MODE } from '@kbn/saved-search-plugin/common';

describe('discoverSessionEmbeddableStateComparison', () => {
  const language = 'kql' as const;
  const baseTab = {
    type: DiscoverTabType.Default as const,
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

  const { comparators } = discoverSessionEmbeddableStateComparison;

  it('compares by-reference keys by reference', () => {
    expect(comparators.ref_id).toBe('referenceEquality');
    expect(comparators.selected_tab_id).toBe('referenceEquality');
    expect(typeof comparators.overrides).toBe('function');
  });

  it('compares selected_tab_id by reference', () => {
    expect(runComparator(comparators.selected_tab_id, undefined, undefined, 'x', 'x')).toBe(true);
    expect(runComparator(comparators.selected_tab_id, undefined, undefined, 'x', 'y')).toBe(false);
  });

  describe('mode changes', () => {
    const byValue = { tabs: [baseTab] };
    const byReference = { ref_id: 'session', overrides: {} };

    it.each([
      { name: 'saving a by-value panel to the library', last: byValue, current: byReference },
      { name: 'unlinking from the library', last: byReference, current: byValue },
    ])('detects $name', ({ last, current }) => {
      expect(areComparatorsEqual<DiscoverSessionEmbeddableState>(comparators, last, current)).toBe(
        false
      );
    });
  });

  describe('tabs comparator', () => {
    const getTabsComparator = () => comparators.tabs;

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
    const getOverridesComparator = () => comparators.overrides;

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

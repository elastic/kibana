/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter } from '@kbn/es-query';
import { FilterStateStore } from '@kbn/es-query';
import { applyControlFiltersToPanels } from './apply_control_filters_to_panels';

const DATA_VIEW_ID = '90943e30-9a47-11e8-b64d-95841ca0b247';
const OTHER_DATA_VIEW_ID = 'other-data-view-id';

// =============================================================================
// FILTER FACTORIES
// =============================================================================

const createPhraseFilter = ({
  key,
  value,
  index = DATA_VIEW_ID,
  controlledBy,
  pinned = false,
}: {
  key: string;
  value: string | number;
  index?: string;
  controlledBy?: string;
  pinned?: boolean;
}): Filter => ({
  meta: {
    key,
    index,
    type: 'phrase',
    ...(controlledBy && { controlledBy }),
  },
  query: {
    match_phrase: {
      [key]: value,
    },
  },
  ...(pinned && { $state: { store: FilterStateStore.GLOBAL_STATE } }),
});

const createPhrasesFilter = ({
  key,
  values,
  index = DATA_VIEW_ID,
  controlledBy,
}: {
  key: string;
  values: Array<string | number>;
  index?: string;
  controlledBy?: string;
}): Filter => ({
  meta: {
    key,
    index,
    type: 'phrases',
    params: values,
    ...(controlledBy && { controlledBy }),
  },
  query: {
    bool: {
      should: values.map((v) => ({ match_phrase: { [key]: v } })),
      minimum_should_match: 1,
    },
  },
});

const createExistsFilter = ({
  key,
  index = DATA_VIEW_ID,
  controlledBy,
  negate = false,
}: {
  key: string;
  index?: string;
  controlledBy?: string;
  negate?: boolean;
}): Filter => ({
  meta: {
    key,
    index,
    type: 'exists',
    negate,
    ...(controlledBy && { controlledBy }),
  },
  query: {
    exists: {
      field: key,
    },
  },
});

const createRangeFilter = ({
  key,
  gte,
  lte,
  index = DATA_VIEW_ID,
  controlledBy,
}: {
  key: string;
  gte?: number;
  lte?: number;
  index?: string;
  controlledBy?: string;
}): Filter => ({
  meta: {
    key,
    index,
    type: 'range',
    params: { gte, lte },
    ...(controlledBy && { controlledBy }),
  },
  query: {
    range: {
      [key]: { gte, lte },
    },
  },
});

// Filter without meta.type (like drill-down filters)
const createDrilldownPhraseFilter = ({
  key,
  value,
  index = DATA_VIEW_ID,
}: {
  key: string;
  value: string | number;
  index?: string;
}): Filter => ({
  meta: {
    key,
    index,
  },
  query: {
    match_phrase: {
      [key]: value,
    },
  },
});

const createDrilldownPhrasesFilter = ({
  key,
  values,
  index = DATA_VIEW_ID,
}: {
  key: string;
  values: Array<string | number>;
  index?: string;
}): Filter => ({
  meta: {
    key,
    index,
  },
  query: {
    bool: {
      should: values.map((v) => ({ match_phrase: { [key]: v } })),
      minimum_should_match: 1,
    },
  },
});

// =============================================================================
// CONTROL PANEL FACTORIES
// =============================================================================

const createOptionsListPanel = ({
  dataViewId = DATA_VIEW_ID,
  fieldName,
  selectedOptions,
}: {
  dataViewId?: string;
  fieldName: string;
  selectedOptions?: Array<string | number>;
}) => ({
  type: 'optionsListControl' as const,
  config: {
    dataViewId,
    fieldName,
    ...(selectedOptions && { selectedOptions }),
  },
});

const createRangeSliderPanel = ({
  dataViewId = DATA_VIEW_ID,
  fieldName,
  value,
}: {
  dataViewId?: string;
  fieldName: string;
  value?: [string, string];
}) => ({
  type: 'rangeSliderControl' as const,
  config: {
    dataViewId,
    fieldName,
    ...(value && { value }),
  },
});

// =============================================================================
// TESTS
// =============================================================================

describe('applyControlFiltersToPanels', () => {
  describe('edge cases', () => {
    it('returns original values when filters is undefined', () => {
      const panels = [createOptionsListPanel({ fieldName: 'status' })];
      const result = applyControlFiltersToPanels(undefined, panels);

      expect(result.updatedPinnedPanels).toEqual(panels);
      expect(result.remainingFilters).toBeUndefined();
    });

    it('returns original values when filters is empty', () => {
      const panels = [createOptionsListPanel({ fieldName: 'status' })];
      const result = applyControlFiltersToPanels([], panels);

      expect(result.updatedPinnedPanels).toEqual(panels);
      expect(result.remainingFilters).toEqual([]);
    });

    it('returns original values when panels is undefined', () => {
      const filters = [createPhraseFilter({ key: 'status', value: 'active' })];
      const result = applyControlFiltersToPanels(filters, undefined);

      expect(result.updatedPinnedPanels).toBeUndefined();
      expect(result.remainingFilters).toEqual(filters);
    });

    it('returns original values when panels is empty', () => {
      const filters = [createPhraseFilter({ key: 'status', value: 'active' })];
      const result = applyControlFiltersToPanels(filters, []);

      expect(result.updatedPinnedPanels).toEqual([]);
      expect(result.remainingFilters).toEqual(filters);
    });
  });

  describe('filter matching criteria', () => {
    it('matches filter to control with same data view and field', () => {
      const filters = [createPhraseFilter({ key: 'status', value: 'active' })];
      const panels = [createOptionsListPanel({ fieldName: 'status' })];

      const result = applyControlFiltersToPanels(filters, panels);

      expect(result.updatedPinnedPanels?.[0].config).toMatchObject({
        selectedOptions: ['active'],
      });
      expect(result.remainingFilters).toBeUndefined();
    });

    it('does not match when data view differs', () => {
      const filters = [
        createPhraseFilter({ key: 'status', value: 'active', index: OTHER_DATA_VIEW_ID }),
      ];
      const panels = [createOptionsListPanel({ fieldName: 'status', dataViewId: DATA_VIEW_ID })];

      const result = applyControlFiltersToPanels(filters, panels);

      // Panel unchanged, filter kept as pill
      expect(result.updatedPinnedPanels?.[0].config).not.toHaveProperty('selectedOptions');
      expect(result.remainingFilters).toHaveLength(1);
    });

    it('does not match when field name differs', () => {
      const filters = [createPhraseFilter({ key: 'status', value: 'active' })];
      const panels = [createOptionsListPanel({ fieldName: 'category' })];

      const result = applyControlFiltersToPanels(filters, panels);

      expect(result.updatedPinnedPanels?.[0].config).not.toHaveProperty('selectedOptions');
      expect(result.remainingFilters).toHaveLength(1);
    });
  });

  describe('filter type compatibility', () => {
    it('matches phrase filter to options list control', () => {
      const filters = [createPhraseFilter({ key: 'status', value: 'active' })];
      const panels = [createOptionsListPanel({ fieldName: 'status' })];

      const result = applyControlFiltersToPanels(filters, panels);

      expect(result.updatedPinnedPanels?.[0].config).toMatchObject({
        selectedOptions: ['active'],
      });
    });

    it('matches phrases filter to options list control', () => {
      const filters = [createPhrasesFilter({ key: 'status', values: ['active', 'pending'] })];
      const panels = [createOptionsListPanel({ fieldName: 'status' })];

      const result = applyControlFiltersToPanels(filters, panels);

      expect(result.updatedPinnedPanels?.[0].config).toMatchObject({
        selectedOptions: ['active', 'pending'],
      });
    });

    it('matches exists filter to options list control', () => {
      const filters = [createExistsFilter({ key: 'status' })];
      const panels = [createOptionsListPanel({ fieldName: 'status' })];

      const result = applyControlFiltersToPanels(filters, panels);

      expect(result.updatedPinnedPanels?.[0].config).toMatchObject({
        existsSelected: true,
      });
    });

    it('matches negated exists filter to options list control', () => {
      const filters = [createExistsFilter({ key: 'status', negate: true })];
      const panels = [createOptionsListPanel({ fieldName: 'status' })];

      const result = applyControlFiltersToPanels(filters, panels);

      expect(result.updatedPinnedPanels?.[0].config).toMatchObject({
        existsSelected: true,
        exclude: true,
      });
    });

    it('matches range filter to range slider control', () => {
      const filters = [createRangeFilter({ key: 'price', gte: 10, lte: 100 })];
      const panels = [createRangeSliderPanel({ fieldName: 'price' })];

      const result = applyControlFiltersToPanels(filters, panels);

      expect(result.updatedPinnedPanels?.[0].config).toMatchObject({
        value: ['10', '100'],
      });
    });

    it('does not match phrase filter to range slider control', () => {
      const filters = [createPhraseFilter({ key: 'price', value: '50' })];
      const panels = [createRangeSliderPanel({ fieldName: 'price' })];

      const result = applyControlFiltersToPanels(filters, panels);

      expect(result.updatedPinnedPanels?.[0].config).not.toHaveProperty('selectedOptions');
      expect(result.remainingFilters).toHaveLength(1);
    });

    it('does not match range filter to options list control', () => {
      const filters = [createRangeFilter({ key: 'status', gte: 1, lte: 5 })];
      const panels = [createOptionsListPanel({ fieldName: 'status' })];

      const result = applyControlFiltersToPanels(filters, panels);

      expect(result.updatedPinnedPanels?.[0].config).not.toHaveProperty('value');
      expect(result.remainingFilters).toHaveLength(1);
    });
  });

  describe('drill-down filters (no meta.type)', () => {
    it('matches drill-down phrase filter by query structure', () => {
      const filters = [createDrilldownPhraseFilter({ key: 'status', value: 'active' })];
      const panels = [createOptionsListPanel({ fieldName: 'status' })];

      const result = applyControlFiltersToPanels(filters, panels);

      expect(result.updatedPinnedPanels?.[0].config).toMatchObject({
        selectedOptions: ['active'],
      });
      expect(result.remainingFilters).toBeUndefined();
    });

    it('matches drill-down phrases filter by query structure', () => {
      const filters = [createDrilldownPhrasesFilter({ key: 'status', values: ['active', 'done'] })];
      const panels = [createOptionsListPanel({ fieldName: 'status' })];

      const result = applyControlFiltersToPanels(filters, panels);

      expect(result.updatedPinnedPanels?.[0].config).toMatchObject({
        selectedOptions: ['active', 'done'],
      });
    });

    it('keeps unmatched drill-down filter as pill', () => {
      const filters = [createDrilldownPhraseFilter({ key: 'category', value: 'electronics' })];
      const panels = [createOptionsListPanel({ fieldName: 'status' })];

      const result = applyControlFiltersToPanels(filters, panels);

      expect(result.updatedPinnedPanels?.[0].config).not.toHaveProperty('selectedOptions');
      expect(result.remainingFilters).toHaveLength(1);
      expect(result.remainingFilters?.[0]).toEqual(filters[0]);
    });
  });

  describe('pinned filters', () => {
    it('keeps pinned filters as pills even when matching control exists', () => {
      const filters = [createPhraseFilter({ key: 'status', value: 'active', pinned: true })];
      const panels = [createOptionsListPanel({ fieldName: 'status' })];

      const result = applyControlFiltersToPanels(filters, panels);

      // Panel unchanged
      expect(result.updatedPinnedPanels?.[0].config).not.toHaveProperty('selectedOptions');
      // Filter kept as pill
      expect(result.remainingFilters).toHaveLength(1);
      expect(result.remainingFilters?.[0]).toEqual(filters[0]);
    });
  });

  describe('control filters (with controlledBy)', () => {
    it('applies matching control filter to control', () => {
      const filters = [
        createPhraseFilter({
          key: 'status',
          value: 'active',
          controlledBy: 'some-control-id',
        }),
      ];
      const panels = [createOptionsListPanel({ fieldName: 'status' })];

      const result = applyControlFiltersToPanels(filters, panels);

      expect(result.updatedPinnedPanels?.[0].config).toMatchObject({
        selectedOptions: ['active'],
      });
      expect(result.remainingFilters).toBeUndefined();
    });

    it('removes unmatched control filter (does not keep as pill)', () => {
      const filters = [
        createPhraseFilter({
          key: 'category',
          value: 'electronics',
          controlledBy: 'some-control-id',
        }),
      ];
      const panels = [createOptionsListPanel({ fieldName: 'status' })];

      const result = applyControlFiltersToPanels(filters, panels);

      // Panel unchanged
      expect(result.updatedPinnedPanels?.[0].config).not.toHaveProperty('selectedOptions');
      // Control filter removed, not kept as pill
      expect(result.remainingFilters).toBeUndefined();
    });
  });

  describe('mixed filter scenarios', () => {
    it('handles mix of matching and non-matching filters correctly', () => {
      const matchingControlFilter = createPhraseFilter({
        key: 'status',
        value: 'active',
        controlledBy: 'ctrl-1',
      });
      const unmatchingControlFilter = createPhraseFilter({
        key: 'region',
        value: 'US',
        controlledBy: 'ctrl-2',
      });
      const matchingDrilldownFilter = createDrilldownPhraseFilter({
        key: 'category',
        value: 'books',
      });
      const unmatchingDrilldownFilter = createDrilldownPhraseFilter({
        key: 'brand',
        value: 'acme',
      });
      const pinnedFilter = createPhraseFilter({
        key: 'status',
        value: 'closed',
        pinned: true,
      });

      const filters = [
        matchingControlFilter,
        unmatchingControlFilter,
        matchingDrilldownFilter,
        unmatchingDrilldownFilter,
        pinnedFilter,
      ];
      const panels = [
        createOptionsListPanel({ fieldName: 'status' }),
        createOptionsListPanel({ fieldName: 'category' }),
      ];

      const result = applyControlFiltersToPanels(filters, panels);

      // Matching filters applied to controls
      expect(result.updatedPinnedPanels?.[0].config).toMatchObject({
        selectedOptions: ['active'],
      });
      expect(result.updatedPinnedPanels?.[1].config).toMatchObject({
        selectedOptions: ['books'],
      });

      // Remaining filters should be:
      // - pinnedFilter (always kept)
      // - unmatchingDrilldownFilter (kept as pill)
      // NOT: unmatchingControlFilter (removed)
      expect(result.remainingFilters).toHaveLength(2);
      expect(result.remainingFilters).toContainEqual(pinnedFilter);
      expect(result.remainingFilters).toContainEqual(unmatchingDrilldownFilter);
      expect(result.remainingFilters).not.toContainEqual(unmatchingControlFilter);
    });

    it('matches first compatible control when multiple exist', () => {
      const filters = [createPhraseFilter({ key: 'status', value: 'active' })];
      const panels = [
        createOptionsListPanel({ fieldName: 'status' }),
        createOptionsListPanel({ fieldName: 'status' }), // duplicate
      ];

      const result = applyControlFiltersToPanels(filters, panels);

      // First panel gets the selection
      expect(result.updatedPinnedPanels?.[0].config).toMatchObject({
        selectedOptions: ['active'],
      });
      // Second panel unchanged
      expect(result.updatedPinnedPanels?.[1].config).not.toHaveProperty('selectedOptions');
    });
  });

  describe('selection extraction', () => {
    it('extracts numeric values correctly', () => {
      const filters = [createPhrasesFilter({ key: 'count', values: [1, 2, 3] })];
      const panels = [createOptionsListPanel({ fieldName: 'count' })];

      const result = applyControlFiltersToPanels(filters, panels);

      expect(result.updatedPinnedPanels?.[0].config).toMatchObject({
        selectedOptions: [1, 2, 3],
      });
    });

    it('extracts partial range correctly (only gte)', () => {
      const filters = [createRangeFilter({ key: 'price', gte: 10 })];
      const panels = [createRangeSliderPanel({ fieldName: 'price' })];

      const result = applyControlFiltersToPanels(filters, panels);

      expect(result.updatedPinnedPanels?.[0].config).toMatchObject({
        value: ['10', ''],
      });
    });

    it('extracts partial range correctly (only lte)', () => {
      const filters = [createRangeFilter({ key: 'price', lte: 100 })];
      const panels = [createRangeSliderPanel({ fieldName: 'price' })];

      const result = applyControlFiltersToPanels(filters, panels);

      expect(result.updatedPinnedPanels?.[0].config).toMatchObject({
        value: ['', '100'],
      });
    });

    it('preserves exclude flag from negated filter', () => {
      const filter: Filter = {
        meta: {
          key: 'status',
          index: DATA_VIEW_ID,
          type: 'phrase',
          negate: true,
        },
        query: {
          match_phrase: {
            status: 'inactive',
          },
        },
      };
      const panels = [createOptionsListPanel({ fieldName: 'status' })];

      const result = applyControlFiltersToPanels([filter], panels);

      expect(result.updatedPinnedPanels?.[0].config).toMatchObject({
        selectedOptions: ['inactive'],
        exclude: true,
      });
    });
  });
});

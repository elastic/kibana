/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter, RangeFilterParams } from '@kbn/es-query';
import { isFilterPinned } from '@kbn/es-query';
import { OPTIONS_LIST_CONTROL, RANGE_SLIDER_CONTROL } from '@kbn/controls-constants';
import type { DashboardState } from '../../../../common';

// =============================================================================
// TYPES
// =============================================================================

type ControlPanel = NonNullable<DashboardState['pinned_panels']>[number];

interface ControlConfig {
  dataViewId?: string;
  fieldName?: string;
  selectedOptions?: Array<string | number>;
  existsSelected?: boolean;
  exclude?: boolean;
  value?: [string, string]; // For range slider [min, max]
}

// =============================================================================
// FILTER CLASSIFICATION
// Determines how each filter type should be handled during navigation
// =============================================================================

/**
 * Control filters have `controlledBy` set - they were created by a control on the source dashboard.
 * These should be applied to matching controls, or REMOVED if no match (not kept as pills).
 */
const isControlFilter = (filter: Filter): boolean => {
  return Boolean(filter.meta?.controlledBy);
};

/**
 * Determines if a filter can potentially be matched to a control.
 * Requires field name and data view info. Pinned filters are excluded since
 * they must always persist as pills to avoid being lost on navigation.
 */
const canMatchToControl = (filter: Filter): boolean => {
  if (isFilterPinned(filter)) return false;
  return Boolean(filter.meta?.key && filter.meta?.index);
};

// =============================================================================
// IDENTIFIER EXTRACTION
// Extracts matching criteria from filters and controls
// =============================================================================

const getFilterFieldInfo = (filter: Filter) => ({
  dataViewId: filter.meta?.index,
  fieldName: filter.meta?.key,
});

const getControlFieldInfo = (panel: ControlPanel) => {
  const config = panel.config as ControlConfig | undefined;
  return {
    dataViewId: config?.dataViewId,
    fieldName: config?.fieldName,
  };
};

// =============================================================================
// MATCHING LOGIC
// Determines if a filter can be applied to a specific control
// =============================================================================

/**
 * Checks if filter and control have the same data view and field name
 */
const fieldInfoMatches = (filter: Filter, panel: ControlPanel): boolean => {
  const filterInfo = getFilterFieldInfo(filter);
  const controlInfo = getControlFieldInfo(panel);

  if (!filterInfo.dataViewId || !filterInfo.fieldName) return false;
  if (!controlInfo.dataViewId || !controlInfo.fieldName) return false;

  return (
    filterInfo.dataViewId === controlInfo.dataViewId &&
    filterInfo.fieldName === controlInfo.fieldName
  );
};

/**
 * Checks if the filter type can be represented by the control type.
 * We check both meta.type and query structure since meta.type isn't always set.
 */
const filterTypeCompatibleWithControl = (filter: Filter, panel: ControlPanel): boolean => {
  const filterType = filter.meta?.type;

  if (panel.type === OPTIONS_LIST_CONTROL) {
    return (
      filterType === 'phrase' ||
      filterType === 'phrases' ||
      filterType === 'exists' ||
      Boolean(filter.query?.exists) ||
      Boolean(filter.query?.match_phrase) ||
      Boolean(filter.query?.bool?.should)
    );
  }

  if (panel.type === RANGE_SLIDER_CONTROL) {
    return filterType === 'range' || Boolean(filter.query?.range);
  }

  return false;
};

// =============================================================================
// SELECTION EXTRACTION
// Extracts the selected values from a filter to apply to a control
// =============================================================================

/**
 * Extracts selection state from a filter for an options list control
 */
const extractOptionsListSelections = (
  filter: Filter
): { selectedOptions?: Array<string | number>; existsSelected?: boolean; exclude?: boolean } => {
  const result: {
    selectedOptions?: Array<string | number>;
    existsSelected?: boolean;
    exclude?: boolean;
  } = {};

  if (filter.meta?.negate) {
    result.exclude = true;
  }

  // Exists filter
  if (filter.query?.exists) {
    result.existsSelected = true;
    return result;
  }

  // Phrases filter (multiple values) - check meta.params first
  if (filter.meta?.type === 'phrases' && Array.isArray(filter.meta?.params)) {
    result.selectedOptions = filter.meta.params;
    return result;
  }

  // Phrases filter via query structure (bool.should)
  if (filter.query?.bool?.should && Array.isArray(filter.query.bool.should)) {
    const values: Array<string | number> = [];
    for (const clause of filter.query.bool.should) {
      if (clause.match_phrase) {
        const fieldName = Object.keys(clause.match_phrase)[0];
        if (fieldName) {
          values.push(clause.match_phrase[fieldName]);
        }
      }
    }
    if (values.length > 0) {
      result.selectedOptions = values;
      return result;
    }
  }

  // Phrase filter (single value) - check query structure
  if (filter.query?.match_phrase) {
    const fieldName = filter.meta?.key ?? Object.keys(filter.query.match_phrase)[0];
    if (fieldName && filter.query.match_phrase[fieldName] !== undefined) {
      result.selectedOptions = [filter.query.match_phrase[fieldName]];
      return result;
    }
  }

  // Phrase filter via meta.params
  if (filter.meta?.type === 'phrase' && filter.meta?.params) {
    const params = filter.meta.params;
    if (typeof params === 'object' && 'query' in params) {
      result.selectedOptions = [(params as { query: string | number }).query];
      return result;
    }
  }

  return result;
};

/**
 * Extracts range values from a filter for a range slider control
 */
const extractRangeSliderValues = (filter: Filter): { value?: [string, string] } => {
  const params = filter.meta?.params as RangeFilterParams | undefined;
  if (!params) return {};

  const { gte, lte } = params;
  const minValue = gte !== undefined && gte !== -Infinity ? String(gte) : '';
  const maxValue = lte !== undefined && lte !== Infinity ? String(lte) : '';

  if (minValue || maxValue) {
    return { value: [minValue, maxValue] };
  }

  return {};
};

/**
 * Applies filter selections to a control panel, returning the updated panel
 */
const applyFilterToControl = (filter: Filter, panel: ControlPanel): ControlPanel => {
  const config = (panel.config ?? {}) as ControlConfig;

  if (panel.type === OPTIONS_LIST_CONTROL) {
    return {
      ...panel,
      config: { ...config, ...extractOptionsListSelections(filter) },
    };
  }

  if (panel.type === RANGE_SLIDER_CONTROL) {
    return {
      ...panel,
      config: { ...config, ...extractRangeSliderValues(filter) },
    };
  }

  return panel;
};

// =============================================================================
// MAIN EXPORT
// =============================================================================

/**
 * Applies incoming navigation filters to matching controls on the destination dashboard.
 *
 * ## Filter Handling Rules
 *
 * | Filter Type          | Has Matching Control | No Matching Control |
 * |----------------------|----------------------|---------------------|
 * | Pinned filter        | Keep as pill         | Keep as pill        |
 * | Control filter       | Apply to control     | REMOVE              |
 * | Drill-down filter    | Apply to control     | Keep as pill        |
 * | Regular filter pill  | Keep as pill         | Keep as pill        |
 *
 * ## Matching Criteria
 * - Same data view ID
 * - Same field name
 * - Compatible filter type (phrase/phrases → options list, range → range slider)
 */
export function applyControlFiltersToPanels(
  filters: Filter[] | undefined,
  controlPanels: DashboardState['pinned_panels']
): {
  updatedPinnedPanels: DashboardState['pinned_panels'];
  remainingFilters: Filter[] | undefined;
} {
  // Nothing to process
  if (!filters?.length || !controlPanels?.length) {
    return {
      updatedPinnedPanels: controlPanels,
      remainingFilters: filters,
    };
  }

  // Separate filters that can potentially match controls from those that can't
  const matchableFilters = filters.filter(canMatchToControl);
  const unmatchableFilters = filters.filter((f) => !canMatchToControl(f));

  if (!matchableFilters.length) {
    return {
      updatedPinnedPanels: controlPanels,
      remainingFilters: filters,
    };
  }

  // Track which filters successfully matched
  const matchedIndices = new Set<number>();
  const updatedPanels = [...controlPanels];

  // Try to match each filter to a control
  matchableFilters.forEach((filter, index) => {
    const panelIndex = updatedPanels.findIndex(
      (panel) => fieldInfoMatches(filter, panel) && filterTypeCompatibleWithControl(filter, panel)
    );

    if (panelIndex !== -1) {
      updatedPanels[panelIndex] = applyFilterToControl(filter, updatedPanels[panelIndex]);
      matchedIndices.add(index);
    }
  });

  // Determine which unmatched filters to keep:
  // - Control filters: remove (they shouldn't appear as pills)
  // - Other filters (drill-down, etc.): keep as pills
  const unmatchedFiltersToKeep = matchableFilters.filter((filter, index) => {
    if (matchedIndices.has(index)) return false;
    if (isControlFilter(filter)) return false; // Remove unmatched control filters
    return true;
  });

  const remainingFilters = [...unmatchableFilters, ...unmatchedFiltersToKeep];

  return {
    updatedPinnedPanels: updatedPanels,
    remainingFilters: remainingFilters.length ? remainingFilters : undefined,
  };
}

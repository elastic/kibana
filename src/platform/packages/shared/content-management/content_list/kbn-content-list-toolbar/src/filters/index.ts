/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Filter container and declarative components.
export { Filters, type FiltersProps } from './filters';
export { SortFilter, type SortFilterProps, SortRenderer, type SortRendererProps } from './sort';
export {
  TagFilter,
  type TagFilterProps,
  TagFilterRenderer,
  type TagFilterRendererProps,
  useTagQueryParser,
} from './tags';

// Common popover components.
export { FilterPopover, useFilterPopover, type FilterPopoverProps } from './filter_popover';
export { FilterPopoverHeader, type FilterPopoverHeaderProps } from './filter_popover_header';
export { FilterSelectionHeader, type FilterSelectionHeaderProps } from './filter_selection_header';
export {
  SelectableFilterPopover,
  StandardFilterOption,
  type SelectableFilterPopoverProps,
  type SelectableFilterOption,
  type StandardOptionRenderProps,
} from './selectable_filter_popover';

// Filter utilities.
export {
  useFieldQueryFilter,
  isExcludeModifier,
  getCheckedState,
  ModifierKeyTip,
  FilterCountBadge,
  type FilterType,
  type FilterSelection,
  type UseFieldQueryFilterOptions,
  type UseFieldQueryFilterResult,
  type ModifierKeyTipProps,
  type FilterCountBadgeProps,
} from './filter_utils';

// Query parser pipeline — implement `QueryParser` to add a new filter type.
export { parseFiltersFromQuery, type QueryParser, type QueryParserResult } from './query_parser';

// Part factory and context (used by `useFilters` hook).
export { filter, type FilterPresets, type FilterContext } from './part';

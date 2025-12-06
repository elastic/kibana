/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  ContentListToolbar as ContentListToolbarComponent,
  type ContentListToolbarProps,
} from './content_list_toolbar';

// Import marker components.
import {
  Filters,
  Filter,
  StarredFilter,
  SortFilter,
  TagsFilter,
  CreatedByFilter,
  type FiltersProps,
  type FilterProps,
  type StarredFilterProps,
  type SortFilterProps,
  type TagsFilterProps,
  type CreatedByFilterProps,
} from './filters/markers';

import {
  SelectionActions,
  SelectionAction,
  DeleteAction,
  ExportAction,
  type SelectionActionsProps,
  type SelectionActionProps,
  type DeleteActionProps,
  type ExportActionProps,
} from './selection_actions';

// Import global actions.
import { CreateButton, type CreateButtonProps } from './global_actions';

// Import portable configuration types.
import type { ActionDescriptor } from './selection_actions/parse_children';
import type { FilterPropsMap } from './filters/parse_children';

// Import renderers (for advanced usage).
import { NULL_USER } from './filters/renderers/created_by_renderer';

// Re-export `ToolbarButton` for custom layouts.
import { ToolbarButton, type ToolbarButtonProps } from './toolbar_button';

// Export types.
export type {
  ContentListToolbarProps,
  // Filter marker types.
  FiltersProps,
  FilterProps,
  StarredFilterProps,
  SortFilterProps,
  TagsFilterProps,
  CreatedByFilterProps,
  // Selection action marker types.
  SelectionActionsProps,
  SelectionActionProps,
  DeleteActionProps,
  ExportActionProps,
  // Global action types.
  CreateButtonProps,
  // Portable configuration types.
  ActionDescriptor,
  FilterPropsMap,
  // Toolbar button type.
  ToolbarButtonProps,
};

// Attach sub-components to `ContentListToolbar` namespace.
export const ContentListToolbar = Object.assign(ContentListToolbarComponent, {
  Filters,
  SelectionActions,
  SelectionAction,
  CreateButton,
  Button: ToolbarButton,
});

// Re-export individual marker components for direct imports.
export {
  Filters,
  Filter,
  StarredFilter,
  SortFilter,
  TagsFilter,
  CreatedByFilter,
  SelectionActions,
  SelectionAction,
  DeleteAction,
  ExportAction,
  CreateButton,
  ToolbarButton,
  NULL_USER,
};

// Re-export parsing functions for advanced usage (e.g., `EuiInMemoryTable` integration).
export { parseFiltersFromChildren, DEFAULT_FILTER_ORDER } from './filters/parse_children';
export { buildSearchBarFilters, type FilterBuilderContext } from './filters/build_filters';
export { parseSelectionActionsFromChildren } from './selection_actions/parse_children';
export { buildActionsFromConfig } from './selection_actions/build_actions';

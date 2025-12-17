/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// ========================================
// PUBLIC API
// ========================================

/**
 * Main grid component for displaying content lists in a card layout.
 *
 * Integrates with {@link ContentListProvider} from `@kbn/content-list-provider`.
 *
 * @example Basic usage
 * ```tsx
 * <ContentListProvider {...providerProps}>
 *   <ContentListGrid iconType="dashboardApp" />
 * </ContentListProvider>
 * ```
 */
export { ContentListGrid } from './content_list_grid';
export type { ContentListGridProps } from './types';

/**
 * Individual card component for rendering a single item.
 *
 * Used internally by {@link ContentListGrid} but exported for custom implementations.
 */
export { ContentListCard } from './content_list_card';
export type { ContentListCardProps, CardActions } from './types';

/**
 * Toggle component for switching between table and grid view modes.
 *
 * Follows the pattern from the Kibana space selector screen.
 *
 * @example
 * ```tsx
 * const [viewMode, setViewMode] = useState<ViewMode>('table');
 *
 * <ViewModeToggle
 *   viewMode={viewMode}
 *   onChange={setViewMode}
 * />
 * ```
 */
export { ViewModeToggle } from './view_mode_toggle';
export type { ViewModeToggleProps, ViewMode } from './types';

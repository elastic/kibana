/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContentListItem } from '../../item';

/**
 * Handler function type for bulk selection actions.
 */
export type SelectionActionHandler = (items: ContentListItem[]) => void;

/**
 * Selection actions configuration - enables bulk operations on selected items.
 *
 * At least one handler should be defined to make selection meaningful.
 * Works with `ContentListItem[]` (standardized format).
 *
 * @example
 * ```tsx
 * <ContentListProvider
 *   selection={{
 *     onSelectionDelete: (items) => handleBulkDelete(items),
 *     onSelectionExport: (items) => handleBulkExport(items),
 *   }}
 * />
 * ```
 */
export interface SelectionActions {
  /** Handler for bulk delete action on selected items. */
  onSelectionDelete?: SelectionActionHandler;
  /** Handler for bulk export action on selected items. */
  onSelectionExport?: SelectionActionHandler;
  /** Custom bulk action handlers (key is the action name). */
  [key: string]: SelectionActionHandler | undefined;
}

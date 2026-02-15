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
 * Return type for the {@link useDeleteAction} hook.
 */
export interface UseDeleteActionReturn {
  /**
   * Opens the delete confirmation modal for the given items.
   * No-op when `isSupported` is `false`.
   */
  requestDelete: (items: ContentListItem[]) => void;
  /** Whether the delete feature is available (requires `item.onDelete` and `!isReadOnly`). */
  isSupported: boolean;
  /** Whether a delete operation is currently executing. */
  isDeleting: boolean;
}

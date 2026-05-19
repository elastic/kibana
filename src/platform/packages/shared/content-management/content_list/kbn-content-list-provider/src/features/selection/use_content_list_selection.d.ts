/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseContentListSelectionReturn } from './types';
/**
 * Hook to access and control item selection.
 *
 * Provides the current selection state and functions to modify it.
 * When selection is disabled (via `features.selection: false` or `isReadOnly`),
 * `setSelection` and `clearSelection` become no-ops and `isSupported` returns `false`.
 *
 * @throws Error if used outside `ContentListProvider`.
 * @returns Object containing selection state, mutation functions, and support flag.
 *
 * @example
 * ```tsx
 * const { selectedItems, selectedCount, clearSelection, isSupported } = useContentListSelection();
 *
 * if (!isSupported) return null;
 *
 * return (
 *   <div>
 *     {selectedCount} items selected
 *     <button onClick={clearSelection}>Clear</button>
 *   </div>
 * );
 * ```
 */
export declare const useContentListSelection: () => UseContentListSelectionReturn;

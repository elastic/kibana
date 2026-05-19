/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
/**
 * Props for {@link ToolbarSkeleton}.
 */
export interface ToolbarSkeletonProps {
  /** Number of filter-button placeholders to render to the right of the search input. */
  filterCount: number;
  /** When `true`, prepends a narrow checkbox placeholder matching the real selection UI. */
  hasSelection: boolean;
  /** Optional `data-test-subj`. */
  'data-test-subj'?: string;
}
/**
 * Loading-state placeholder for `ContentListToolbar`.
 *
 * Mirrors the real toolbar's horizontal layout: an optional selection
 * checkbox, a full-width search input, and one rectangle per configured
 * filter button. All cells share the same row height so the swap to the
 * real toolbar produces no vertical shift.
 */
export declare const ToolbarSkeleton: ({
  filterCount,
  hasSelection,
  'data-test-subj': dataTestSubj,
}: ToolbarSkeletonProps) => React.JSX.Element;

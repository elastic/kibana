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
 * Props for the {@link FilterPopoverHeader} component.
 */
export interface FilterPopoverHeaderProps {
  /** Search element from `EuiSelectable`. */
  search?: React.ReactNode;
  /** Number of active filter selections. */
  activeCount: number;
  /** Callback to clear all selections. */
  onClear: () => void;
  /** `data-test-subj` attribute for the clear button. */
  'data-test-subj'?: string;
}
/**
 * Header section for filter popovers with search and selection controls.
 *
 * Includes:
 * - Optional search box (from `EuiSelectable`).
 * - "X selected" count.
 * - "Clear filter" button.
 *
 * @example
 * ```tsx
 * <EuiSelectable searchable>
 *   {(list, search) => (
 *     <>
 *       <FilterPopoverHeader
 *         search={search}
 *         activeCount={selectedCount}
 *         onClear={clearAll}
 *       />
 *       <EuiHorizontalRule margin="none" />
 *       {list}
 *     </>
 *   )}
 * </EuiSelectable>
 * ```
 */
export declare const FilterPopoverHeader: ({
  search,
  activeCount,
  onClear,
  'data-test-subj': dataTestSubj,
}: FilterPopoverHeaderProps) => React.JSX.Element;

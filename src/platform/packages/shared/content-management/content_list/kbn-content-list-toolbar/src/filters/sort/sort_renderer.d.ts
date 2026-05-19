/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import { type Query } from '@elastic/eui';
/**
 * Props for the {@link SortRenderer} component.
 *
 * When used with `EuiSearchBar` `custom_component` filters, the search bar passes
 * `query` and `onChange` props. The sort filter doesn't use these (it manages sort
 * state separately via `useContentListSort`), but we accept them for compatibility.
 */
export interface SortRendererProps {
  /** Query object from `EuiSearchBar` (unused - sort doesn't affect query). */
  query: Query;
  /** `onChange` callback from `EuiSearchBar` (unused - sort doesn't affect query). */
  onChange?: (query: Query) => void;
  /** Optional `data-test-subj` attribute for testing. */
  'data-test-subj'?: string;
}
/**
 * `SortRenderer` component for the toolbar sort dropdown.
 *
 * This is the actual UI component for the sort dropdown.
 * It renders a popover with a selectable list of sort options.
 *
 * @param props - The component props. See {@link SortRendererProps}.
 * @returns A React element containing the sort dropdown.
 */
export declare const SortRenderer: ({
  'data-test-subj': dataTestSubj,
}: SortRendererProps) => React.JSX.Element;

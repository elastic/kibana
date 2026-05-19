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
 * Props for the {@link UserFieldFilterRenderer} component.
 */
export interface UserFieldFilterRendererProps {
  /** The filter field name (e.g. `'createdBy'`, `'updatedBy'`). */
  fieldName: string;
  /** Title displayed in the popover header and button. */
  title: string;
  /** Query object from `EuiSearchBar`. */
  query?: Query;
  /** `onChange` callback from `EuiSearchBar`. */
  onChange?: (query: Query) => void;
  /** Message shown when no users are available. */
  emptyMessage: string;
  /** Message shown when search yields no matches. */
  noMatchesMessage: string;
  /** Optional `data-test-subj` attribute for testing. */
  'data-test-subj'?: string;
}
/**
 * Generic filter popover renderer for user-UID-based fields.
 *
 * Consumes `useFilterFacets(fieldName)` for display-ready user facets with
 * counts, matching the same pattern used by `TagFilterRenderer`.
 *
 * Reusable across `createdBy`, `updatedBy`, and other user-UID fields.
 */
export declare const UserFieldFilterRenderer: ({
  fieldName,
  title,
  query,
  onChange,
  emptyMessage,
  noMatchesMessage,
  'data-test-subj': dataTestSubj,
}: UserFieldFilterRendererProps) => React.JSX.Element | null;

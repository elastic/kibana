/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { Query } from '@elastic/eui';
/**
 * Props for the {@link CreatedByFilterRenderer} component.
 *
 * When used with `EuiSearchBar` `custom_component` filters, the search bar passes
 * `query` and `onChange` props.
 */
export interface CreatedByFilterRendererProps {
  /** Query object from `EuiSearchBar`. */
  query?: Query;
  /** `onChange` callback from `EuiSearchBar`. */
  onChange?: (query: Query) => void;
  /** Optional `data-test-subj` attribute for testing. */
  'data-test-subj'?: string;
}
/**
 * `CreatedByFilterRenderer` component for `EuiSearchBar` `custom_component` filter.
 *
 * Thin wrapper around {@link UserFieldFilterRenderer} for the `createdBy` field.
 */
export declare const CreatedByFilterRenderer: ({
  query,
  onChange,
  'data-test-subj': dataTestSubj,
}: CreatedByFilterRendererProps) => React.JSX.Element | null;

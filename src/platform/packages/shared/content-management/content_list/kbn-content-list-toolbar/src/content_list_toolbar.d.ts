/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { ReactNode } from 'react';
/**
 * Props for the {@link ContentListToolbar} component.
 */
export interface ContentListToolbarProps {
  /** Optional children for declarative configuration via {@link Filters}. */
  children?: ReactNode;
  /** Optional `data-test-subj` attribute for testing. */
  'data-test-subj'?: string;
}
export declare const ContentListToolbar: (({
  children,
  'data-test-subj': dataTestSubj,
}: ContentListToolbarProps) => React.JSX.Element) & {
  Filters: React.FC<import('./filters').FiltersProps> & {
    Sort: React.FC<import('./filters').SortFilterProps>;
    Tags: React.FC<import('./filters').TagFilterProps>;
    Starred: React.FC<import('./filters').StarredFilterProps>;
    CreatedBy: React.FC<import('./filters/part').CreatedByFilterProps>;
  };
  SelectionBar: ({
    'data-test-subj': dataTestSubj,
  }: import('./selection_bar').SelectionBarProps) => React.JSX.Element | null;
};

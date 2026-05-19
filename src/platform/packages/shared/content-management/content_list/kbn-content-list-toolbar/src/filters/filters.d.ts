/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
/**
 * Props for the {@link Filters} container component.
 */
export interface FiltersProps {
  /** Filter declarative components as children. */
  children?: ReactNode;
}
export declare const Filters: import('react').FC<FiltersProps> & {
  Sort: import('react').FC<import('./part').SortFilterProps>;
  Tags: import('react').FC<import('./part').TagFilterProps>;
  Starred: import('react').FC<import('./part').StarredFilterProps>;
  CreatedBy: import('react').FC<import('./part').CreatedByFilterProps>;
};

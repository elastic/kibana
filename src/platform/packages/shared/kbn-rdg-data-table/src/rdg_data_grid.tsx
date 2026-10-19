/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { TanStackDataGrid, type TanStackDataGridProps } from '@kbn/tanstack-data-table';
import { RdgGridBody } from './rdg_grid_body';

/** Same props as `TanStackDataGrid`, so Discover can switch grids with a feature flag only. */
export type RdgDataGridProps = Omit<TanStackDataGridProps, 'gridBody'>;

/**
 * The TanStack grid (toolbar, popovers, cell actions, header menus, in-table search, comparison,
 * pagination) with its rows and columns rendered and virtualized by react-data-grid.
 */
export const RdgDataGrid = (props: RdgDataGridProps) => (
  <TanStackDataGrid {...props} gridBody={RdgGridBody} />
);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataSourceProfileProvider } from '../../../../profiles';

/**
 * Returns default app state for the metrics grid view. The data table is hidden
 * by default when viewing metrics since the grid is the primary content.
 */
export const getDefaultAppState: DataSourceProfileProvider['profile']['getDefaultAppState'] =
  (prev) => (params) => ({
    ...prev(params),
    hideDataTable: true,
  });

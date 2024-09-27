/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DiscoverGridSettings } from '@kbn/saved-search-plugin/common';

export const onResizeGridColumn = (
  colSettings: { columnId: string; width: number | undefined },
  gridState: DiscoverGridSettings | undefined
): DiscoverGridSettings => {
  const grid = { ...(gridState || {}) };
  const newColumns = { ...(grid.columns || {}) };
  newColumns[colSettings.columnId] = colSettings.width
    ? { width: Math.round(colSettings.width) }
    : {};
  return { ...grid, columns: newColumns };
};

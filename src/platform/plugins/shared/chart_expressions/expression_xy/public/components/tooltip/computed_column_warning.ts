/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getAccessorByDimension,
  getComputedColumnWarningForColumns,
} from '@kbn/chart-expressions-common';
import type { CommonXYDataLayerConfig } from '../../../common';

/**
 * Returns the warning message to show when ES|QL filterable columns (x-accessor and/or
 * split accessors) are computed fields that cannot be used for filtering. Returns
 * `undefined` when there is nothing to warn about.
 */
export const getComputedColumnWarning = (
  dataLayers: CommonXYDataLayerConfig[],
  panelHasConfiguredDrilldowns: boolean
): string | undefined => {
  // Collect all filterable column IDs (x-accessor + split accessors) across layers.
  const allFilterableColumnIds = new Set(
    dataLayers.flatMap((layer) => {
      const ids: string[] = [];
      if (layer.xAccessor) {
        ids.push(getAccessorByDimension(layer.xAccessor, layer.table.columns));
      }
      for (const accessor of layer.splitAccessors ?? []) {
        ids.push(getAccessorByDimension(accessor, layer.table.columns));
      }
      return ids;
    })
  );

  // Resolve and deduplicate the actual DatatableColumn objects by ID.
  const filterableColumnsById = new Map(
    dataLayers.flatMap((layer) =>
      layer.table.columns
        .filter((col) => allFilterableColumnIds.has(col.id))
        .map((col) => [col.id, col] as const)
    )
  );

  return getComputedColumnWarningForColumns(
    [...filterableColumnsById.values()],
    panelHasConfiguredDrilldowns
  );
};

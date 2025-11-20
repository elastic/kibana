/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  LENS_IGNORE_GLOBAL_FILTERS_DEFAULT_VALUE,
  LENS_SAMPLING_DEFAULT_VALUE,
} from '../../../../schema/constants';
import type { LensAttributes } from '../../../../types';

const DEFAULT_LAYER_ID = 'layer_0';

export function canonicalizeCommonState(
  state: LensAttributes,
  layerId: string,
  columnSwap: Array<[old: string | undefined, new: string]> = []
): LensAttributes {
  const clonedState = structuredClone(state);

  // replace layer in reference name
  clonedState.references.forEach((reference) => {
    if (reference.name.includes(layerId)) {
      reference.name = reference.name.replace(layerId, DEFAULT_LAYER_ID);
    }
  });

  for (const [dsType, dsState] of Object.entries(clonedState.state.datasourceStates)) {
    for (const [id, layer] of Object.entries(dsState.layers)) {
      // swap column names
      columnSwap.forEach(([oldColumn, newColumn]) => {
        if (oldColumn && layer.columns[oldColumn]) {
          layer.columns[newColumn] = layer.columns[oldColumn];
          delete layer.columns[oldColumn];
        }
      });

      layer.columnOrder = layer.columnOrder.map(
        (colId: string) => columnSwap.find(([oldColumn]) => oldColumn === colId)?.[1] ?? colId
      );

      // apply defaults
      layer.sampling = layer.sampling ?? LENS_SAMPLING_DEFAULT_VALUE;
      layer.ignoreGlobalFilters =
        layer.ignoreGlobalFilters ?? LENS_IGNORE_GLOBAL_FILTERS_DEFAULT_VALUE;

      // remove incompleteColumns
      if (Object.keys(layer.incompleteColumns).length === 0) {
        delete layer.incompleteColumns;
      }

      if (layerId === id) {
        dsState.layers[DEFAULT_LAYER_ID] = layer;
        delete dsState.layers[id];
      }
    }

    // remove empty datasource states
    if (Object.keys(dsState.layers).length === 0) {
      delete (clonedState.state.datasourceStates as any)[dsType];
    }
  }

  return clonedState;
}

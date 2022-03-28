/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LensMultiTable } from '../../common';
import { DataLayerConfigResult, XYLayerConfigResult } from '../../common/types';
import { getDataLayers } from './visualization';

export function getFilteredLayers(layers: XYLayerConfigResult[], data: LensMultiTable) {
  return getDataLayers(layers).filter<DataLayerConfigResult>(
    (layer): layer is DataLayerConfigResult => {
      const { layerId, xAccessor, accessors, splitAccessor } = layer;
      return !(
        !accessors.length ||
        !data.tables[layerId] ||
        data.tables[layerId].rows.length === 0 ||
        (xAccessor &&
          data.tables[layerId].rows.every((row) => typeof row[xAccessor] === 'undefined')) ||
        // stacked percentage bars have no xAccessors but splitAccessor with undefined values in them when empty
        (!xAccessor &&
          splitAccessor &&
          data.tables[layerId].rows.every((row) => typeof row[splitAccessor] === 'undefined'))
      );
    }
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getAccessorByDimension } from '../../../../../plugins/visualizations/common/utils';
import { DataLayerConfigResult, LensMultiTable, XYLayerConfigResult } from '../../common';
import { isDataLayer } from './visualization';

export function getFilteredLayers(layers: XYLayerConfigResult[], data: LensMultiTable) {
  return layers.filter<DataLayerConfigResult>((layer): layer is DataLayerConfigResult => {
    if (!isDataLayer(layer)) {
      return false;
    }

    const { layerId, accessors, xAccessor, splitAccessor } = layer;
    const table = data.tables[layerId];

    const xColumnId = xAccessor && table && getAccessorByDimension(xAccessor, table.columns);
    const splitColumnId =
      splitAccessor && table && getAccessorByDimension(splitAccessor, table.columns);

    return !(
      !accessors.length ||
      !table ||
      table.rows.length === 0 ||
      (xColumnId && table.rows.every((row) => typeof row[xColumnId] === 'undefined')) ||
      // stacked percentage bars have no xAccessors but splitAccessor with undefined values in them when empty
      (!xColumnId &&
        splitColumnId &&
        table.rows.every((row) => typeof row[splitColumnId] === 'undefined'))
    );
  });
}

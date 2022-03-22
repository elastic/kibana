/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CommonXYLayerConfigResult, CommonXYDataLayerConfigResult } from '../../common';

export function getFilteredLayers(layers: CommonXYLayerConfigResult[]) {
  return layers.filter<CommonXYLayerConfigResult>((layer): layer is CommonXYLayerConfigResult => {
    const { accessors, table } = layer;
    const { xAccessor, splitAccessor } = layer as CommonXYDataLayerConfigResult;

    return !(
      !accessors.length ||
      !table ||
      table.rows.length === 0 ||
      (xAccessor && table.rows.every((row) => typeof row[xAccessor] === 'undefined')) ||
      // stacked percentage bars have no xAccessors but splitAccessor with undefined values in them when empty
      (!xAccessor &&
        splitAccessor &&
        table.rows.every((row) => typeof row[splitAccessor] === 'undefined'))
    );
  });
}

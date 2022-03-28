/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  CommonXYDataLayerConfigResult,
  CommonXYLayerConfigResult,
  CommonXYReferenceLineLayerConfigResult,
} from '../../common';
import { isDataLayer, isReferenceLayer } from './visualization';

export function getFilteredLayers(layers: CommonXYLayerConfigResult[]) {
  return layers.filter<CommonXYReferenceLineLayerConfigResult | CommonXYDataLayerConfigResult>(
    (layer): layer is CommonXYReferenceLineLayerConfigResult | CommonXYDataLayerConfigResult => {
      const { table } = layer;
      let accessors: string[] = [];
      let xAccessor: undefined | string | number;
      let splitAccessor: undefined | string | number;

      if (isDataLayer(layer)) {
        xAccessor = layer.xAccessor;
        splitAccessor = layer.splitAccessor;
      }

      if (isDataLayer(layer) || isReferenceLayer(layer)) {
        accessors = layer.accessors;
      }

      return !(
        !accessors.length ||
        !table ||
        table.rows.length === 0 ||
        (xAccessor &&
          table.rows.every((row) => xAccessor && typeof row[xAccessor] === 'undefined')) ||
        // stacked percentage bars have no xAccessors but splitAccessor with undefined values in them when empty
        (!xAccessor &&
          splitAccessor &&
          table.rows.every((row) => splitAccessor && typeof row[splitAccessor] === 'undefined'))
      );
    }
  );
}

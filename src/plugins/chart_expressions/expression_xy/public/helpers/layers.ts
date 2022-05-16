/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Datatable } from '@kbn/expressions-plugin/common';
import { getAccessorByDimension } from '@kbn/visualizations-plugin/common/utils';
import type { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/common/expression_functions';
import {
  CommonXYDataLayerConfig,
  CommonXYLayerConfig,
  ReferenceLineLayerConfig,
} from '../../common/types';
import { isDataLayer, isReferenceLayer } from './visualization';

export function getFilteredLayers(layers: CommonXYLayerConfig[]) {
  return layers.filter<ReferenceLineLayerConfig | CommonXYDataLayerConfig>(
    (layer): layer is ReferenceLineLayerConfig | CommonXYDataLayerConfig => {
      let table: Datatable | undefined;
      let accessors: Array<ExpressionValueVisDimension | string> = [];
      let xAccessor: undefined | string | number;
      let splitAccessor: undefined | string | number;

      if (isDataLayer(layer) || isReferenceLayer(layer)) {
        table = layer.table;
        accessors = layer.accessors;
      }

      if (isDataLayer(layer)) {
        xAccessor =
          layer.xAccessor && table && getAccessorByDimension(layer.xAccessor, table.columns);
        splitAccessor =
          layer.splitAccessor &&
          table &&
          getAccessorByDimension(layer.splitAccessor, table.columns);
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

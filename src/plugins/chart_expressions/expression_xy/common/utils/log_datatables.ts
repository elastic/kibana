/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExecutionContext } from '../../../../expressions';
import { prepareLogTable } from '../../../../visualizations/common/utils';
import { LayerTypes } from '../constants';
import { strings } from '../i18n';
import { CommonXYLayerConfigResult } from '../types';

export const logDatatables = (layers: CommonXYLayerConfigResult[], handlers: ExecutionContext) => {
  if (!handlers?.inspectorAdapters?.tables) {
    return;
  }

  layers.forEach((layer, index) => {
    if (layer.layerType === LayerTypes.ANNOTATIONS) {
      return;
    }

    let xAccessor;
    let splitAccessor;
    if (layer.layerType === LayerTypes.DATA) {
      xAccessor = layer.xAccessor;
      splitAccessor = layer.splitAccessor;
    }

    const { accessors, layerType } = layer;
    const logTable = prepareLogTable(
      layer.table,
      [
        [
          accessors ? accessors : undefined,
          layerType === LayerTypes.DATA ? strings.getMetricHelp() : strings.getReferenceLineHelp(),
        ],
        [xAccessor ? [xAccessor] : undefined, strings.getXAxisHelp()],
        [splitAccessor ? [splitAccessor] : undefined, strings.getBreakdownHelp()],
      ],
      true
    );

    handlers.inspectorAdapters.tables.logDatatable(index, logTable);
  });
};

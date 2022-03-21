/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LayerTypes } from '../../common/constants';
import {
  CommonXYDataLayerConfigResult,
  CommonXYLayerConfigResult,
  CommonXYReferenceLineLayerConfigResult,
} from '../../common';

export const isDataLayer = (
  layer: CommonXYLayerConfigResult
): layer is CommonXYDataLayerConfigResult =>
  layer.layerType === LayerTypes.DATA || !layer.layerType;

export const getDataLayers = (layers: CommonXYLayerConfigResult[]) =>
  (layers || []).filter((layer): layer is CommonXYDataLayerConfigResult => isDataLayer(layer));

export const isReferenceLayer = (
  layer: CommonXYLayerConfigResult
): layer is CommonXYReferenceLineLayerConfigResult => layer.layerType === LayerTypes.REFERENCELINE;

export const getReferenceLayers = (layers: CommonXYLayerConfigResult[]) =>
  (layers || []).filter((layer): layer is CommonXYReferenceLineLayerConfigResult =>
    isReferenceLayer(layer)
  );

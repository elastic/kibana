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
  CommonXYAnnotationLayerConfigResult,
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

const isAnnotationLayerCommon = (
  layer: CommonXYLayerConfigResult
): layer is CommonXYAnnotationLayerConfigResult => layer.layerType === LayerTypes.ANNOTATIONS;

export const isAnnotationsLayer = (
  layer: CommonXYLayerConfigResult
): layer is CommonXYAnnotationLayerConfigResult => isAnnotationLayerCommon(layer);

export const getAnnotationsLayers = (
  layers: CommonXYLayerConfigResult[]
): CommonXYAnnotationLayerConfigResult[] =>
  (layers || []).filter((layer): layer is CommonXYAnnotationLayerConfigResult =>
    isAnnotationsLayer(layer)
  );

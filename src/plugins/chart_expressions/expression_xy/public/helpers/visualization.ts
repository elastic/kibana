/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LayerTypes } from '../../common/constants';
import {
  CommonXYLayerConfig,
  CommonXYDataLayerConfig,
  CommonXYReferenceLineLayerConfig,
  CommonXYAnnotationLayerConfig,
} from '../../common/types';

export const isDataLayer = (layer: CommonXYLayerConfig): layer is CommonXYDataLayerConfig =>
  layer.layerType === LayerTypes.DATA || !layer.layerType;

export const getDataLayers = (layers: CommonXYLayerConfig[]) =>
  (layers || []).filter((layer): layer is CommonXYDataLayerConfig => isDataLayer(layer));

export const isReferenceLayer = (
  layer: CommonXYLayerConfig
): layer is CommonXYReferenceLineLayerConfig => layer.layerType === LayerTypes.REFERENCELINE;

export const getReferenceLayers = (layers: CommonXYLayerConfig[]) =>
  (layers || []).filter((layer): layer is CommonXYReferenceLineLayerConfig =>
    isReferenceLayer(layer)
  );

const isAnnotationLayerCommon = (
  layer: CommonXYLayerConfig
): layer is CommonXYAnnotationLayerConfig => layer.layerType === LayerTypes.ANNOTATIONS;

export const isAnnotationsLayer = (
  layer: CommonXYLayerConfig
): layer is CommonXYAnnotationLayerConfig => isAnnotationLayerCommon(layer);

export const getAnnotationsLayers = (
  layers: CommonXYLayerConfig[]
): CommonXYAnnotationLayerConfig[] =>
  (layers || []).filter((layer): layer is CommonXYAnnotationLayerConfig =>
    isAnnotationsLayer(layer)
  );

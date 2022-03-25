/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  DataLayerConfigResult,
  ReferenceLineLayerConfigResult,
  XYAnnotationLayerConfig,
  XYLayerConfigResult,
  XYLayerConfig,
  XYDataLayerConfig,
  XYReferenceLineLayerConfig,
  AnnotationLayerConfigResult,
} from '../../common/types';
import { LayerTypes } from '../../common/constants';

export const isDataLayer = (
  layer: XYLayerConfig | XYLayerConfigResult
): layer is XYDataLayerConfig | DataLayerConfigResult =>
  layer.layerType === LayerTypes.DATA || !layer.layerType;

export const getDataLayers = (layers: Array<XYLayerConfig | XYLayerConfigResult>) =>
  (layers || []).filter((layer): layer is XYDataLayerConfig | DataLayerConfigResult =>
    isDataLayer(layer)
  );

export const isReferenceLayer = (
  layer: XYLayerConfigResult
): layer is ReferenceLineLayerConfigResult => layer.layerType === LayerTypes.REFERENCELINE;

export const getReferenceLayers = (layers: XYLayerConfigResult[]) =>
  (layers || []).filter((layer): layer is ReferenceLineLayerConfigResult =>
    isReferenceLayer(layer)
  );

const isAnnotationLayerCommon = (
  layer: XYLayerConfig | XYLayerConfigResult
): layer is XYAnnotationLayerConfig | AnnotationLayerConfigResult =>
  layer.layerType === LayerTypes.ANNOTATIONS;

export const isAnnotationsLayerConfig = (layer: XYLayerConfig): layer is XYAnnotationLayerConfig =>
  isAnnotationLayerCommon(layer);

export const isAnnotationsLayer = (
  layer: XYLayerConfigResult
): layer is AnnotationLayerConfigResult => isAnnotationLayerCommon(layer);

export const getAnnotationsLayersConfig = (layers: XYLayerConfig[]): XYAnnotationLayerConfig[] =>
  (layers || []).filter((layer): layer is XYAnnotationLayerConfig =>
    isAnnotationsLayerConfig(layer)
  );

export const getAnnotationsLayers = (
  layers: XYLayerConfigResult[]
): AnnotationLayerConfigResult[] =>
  (layers || []).filter((layer): layer is AnnotationLayerConfigResult => isAnnotationsLayer(layer));

export interface LayerTypeToLayer {
  [LayerTypes.DATA]: (layer: XYDataLayerConfig) => XYDataLayerConfig;
  [LayerTypes.REFERENCELINE]: (layer: XYReferenceLineLayerConfig) => XYReferenceLineLayerConfig;
  [LayerTypes.ANNOTATIONS]: (layer: XYAnnotationLayerConfig) => XYAnnotationLayerConfig;
}

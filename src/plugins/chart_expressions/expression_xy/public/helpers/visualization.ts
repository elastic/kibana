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
  XYLayerConfigResult,
  AnnotationLayerConfigResult,
} from '../../common/types';
import { LayerTypes } from '../../common/constants';

export const isDataLayer = (layer: XYLayerConfigResult): layer is DataLayerConfigResult =>
  layer.layerType === LayerTypes.DATA || !layer.layerType;

export const getDataLayers = (layers: XYLayerConfigResult[]) =>
  (layers || []).filter((layer): layer is DataLayerConfigResult => isDataLayer(layer));

export const isReferenceLayer = (
  layer: XYLayerConfigResult
): layer is ReferenceLineLayerConfigResult => layer.layerType === LayerTypes.REFERENCELINE;

export const getReferenceLayers = (layers: XYLayerConfigResult[]) =>
  (layers || []).filter((layer): layer is ReferenceLineLayerConfigResult =>
    isReferenceLayer(layer)
  );

const isAnnotationLayerCommon = (
  layer: XYLayerConfigResult
): layer is AnnotationLayerConfigResult => layer.layerType === LayerTypes.ANNOTATIONS;

export const isAnnotationsLayer = (
  layer: XYLayerConfigResult
): layer is AnnotationLayerConfigResult => isAnnotationLayerCommon(layer);

export const getAnnotationsLayers = (
  layers: XYLayerConfigResult[]
): AnnotationLayerConfigResult[] =>
  (layers || []).filter((layer): layer is AnnotationLayerConfigResult => isAnnotationsLayer(layer));

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { XYDataLayerConfig, XYLayerConfig } from '@kbn/lens-common';
import { isEsqlTableTypeDataset } from '../../../utils';
import type {
  DataLayerType,
  ReferenceLineLayerType,
  AnnotationLayerType,
  LayerTypeESQL,
  LayerTypeNoESQL,
} from '../../../schema/charts/xy';
import {
  XY_ANNOTATION_LAYER_TYPES,
  XY_REFERENCE_LAYER_TYPES,
  XY_DATA_LAYER_TYPES,
  AVAILABLE_XY_LAYER_TYPES,
} from './constants';

type XYLayer = DataLayerType | ReferenceLineLayerType | AnnotationLayerType;

export function getAccessorNameForXY(
  layer: XYLayer,
  accessorType: 'x' | 'y' | 'y_ref' | 'breakdown' | 'threshold' | 'event',
  index?: number
): string {
  if (index == null) {
    return `${layer.type}_${accessorType}`;
  }
  return `${layer.type}_${accessorType}_${index}`;
}

export function getIdForLayer(layer: LayerTypeNoESQL | LayerTypeESQL, i: number) {
  return `${layer.type}_${i}`;
}

export function isAPIAnnotationLayer(layer: XYLayer): layer is AnnotationLayerType {
  return XY_ANNOTATION_LAYER_TYPES.some((annotationType) => annotationType === layer.type);
}

export function isAPIReferenceLineLayer(layer: XYLayer): layer is ReferenceLineLayerType {
  return XY_REFERENCE_LAYER_TYPES.some((type) => type === layer.type);
}

export function isAPIDataLayer(layer: XYLayer): layer is DataLayerType {
  return XY_DATA_LAYER_TYPES.some((type) => type === layer.type);
}

export function isAPIXYLayer(layer: unknown): layer is XYLayer {
  return (
    typeof layer === 'object' &&
    layer !== null &&
    'type' in layer &&
    typeof layer.type === 'string' &&
    AVAILABLE_XY_LAYER_TYPES.some((type) => type === layer.type)
  );
}

export function isAPIesqlXYLayer(layer: XYLayer): layer is LayerTypeESQL {
  return isEsqlTableTypeDataset(layer.dataset);
}

export function isLensStateDataLayer(layer: XYLayerConfig): layer is XYDataLayerConfig {
  return layer.layerType === 'data' || !('layerType' in layer);
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  DataLayerType,
  ReferenceLineLayerType,
  AnnotationLayerType,
  LayerTypeESQL,
} from '../../../schema/charts/xy';
import {
  XY_ANNOTATION_LAYER_TYPES,
  XY_REFERENCE_LAYER_TYPES,
  XY_DATA_LAYER_TYPES,
  AVAILABLE_XY_LAYER_TYPES,
} from './constants';

export function isAPIAnnotationLayer(
  layer: DataLayerType | ReferenceLineLayerType | AnnotationLayerType
): layer is AnnotationLayerType {
  return XY_ANNOTATION_LAYER_TYPES.some((annotationType) => annotationType === layer.type);
}

export function isAPIReferenceLineLayer(
  layer: DataLayerType | ReferenceLineLayerType | AnnotationLayerType
): layer is ReferenceLineLayerType {
  return XY_REFERENCE_LAYER_TYPES.some((type) => type === layer.type);
}

export function isAPIDataLayer(
  layer: DataLayerType | ReferenceLineLayerType | AnnotationLayerType
): layer is DataLayerType {
  return XY_DATA_LAYER_TYPES.some((type) => type === layer.type);
}

export function isAPIXYLayer(
  layer: unknown
): layer is DataLayerType | ReferenceLineLayerType | AnnotationLayerType {
  return (
    typeof layer === 'object' &&
    layer !== null &&
    'type' in layer &&
    typeof layer.type === 'string' &&
    AVAILABLE_XY_LAYER_TYPES.some((type) => type === layer.type)
  );
}

export function isAPIesqlXYLayer(
  layer: DataLayerType | ReferenceLineLayerType | AnnotationLayerType
): layer is LayerTypeESQL {
  return ['esql', 'table'].includes(layer.dataset.type);
}

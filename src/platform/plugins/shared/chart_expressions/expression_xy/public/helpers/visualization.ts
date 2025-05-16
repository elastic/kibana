/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  LayerTypes,
  REFERENCE_LINE,
  REFERENCE_LINE_LAYER,
  EXTENDED_REFERENCE_LINE_DECORATION_CONFIG,
} from '../../common/constants';
import {
  CommonXYLayerConfig,
  CommonXYDataLayerConfig,
  CommonXYReferenceLineLayerConfig,
  CommonXYAnnotationLayerConfig,
  ReferenceLineLayerConfig,
  ReferenceLineConfig,
  ReferenceLineDecorationConfigResult,
  ExtendedReferenceLineDecorationConfig,
} from '../../common/types';

export const isDataLayer = (layer: CommonXYLayerConfig): layer is CommonXYDataLayerConfig =>
  layer.layerType === LayerTypes.DATA || !layer.layerType;

export const getDataLayers = (layers: CommonXYLayerConfig[]) =>
  (layers || []).filter((layer): layer is CommonXYDataLayerConfig => isDataLayer(layer));

export const isReferenceLayer = (layer: CommonXYLayerConfig): layer is ReferenceLineLayerConfig =>
  layer.layerType === LayerTypes.REFERENCELINE && layer.type === REFERENCE_LINE_LAYER;

export const isReferenceLine = (layer: CommonXYLayerConfig): layer is ReferenceLineConfig =>
  layer.type === REFERENCE_LINE;

export const isReferenceLineDecorationConfig = (
  decoration: ExtendedReferenceLineDecorationConfig | ReferenceLineDecorationConfigResult
): decoration is ExtendedReferenceLineDecorationConfig =>
  decoration.type === EXTENDED_REFERENCE_LINE_DECORATION_CONFIG;

export const isReferenceLineOrLayer = (
  layer: CommonXYLayerConfig
): layer is CommonXYReferenceLineLayerConfig => layer.layerType === LayerTypes.REFERENCELINE;

export const getReferenceLayers = (layers: CommonXYLayerConfig[]) =>
  (layers || []).filter(
    (layer): layer is CommonXYReferenceLineLayerConfig =>
      isReferenceLayer(layer) || isReferenceLine(layer)
  );

const isAnnotationLayerCommon = (
  layer: CommonXYLayerConfig
): layer is CommonXYAnnotationLayerConfig => layer.layerType === LayerTypes.ANNOTATIONS;

export const isAnnotationsLayer = (
  layer: CommonXYLayerConfig
): layer is CommonXYAnnotationLayerConfig => isAnnotationLayerCommon(layer);

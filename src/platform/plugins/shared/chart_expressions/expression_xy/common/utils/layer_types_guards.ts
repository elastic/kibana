/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LayerTypes, REFERENCE_LINE, REFERENCE_LINE_LAYER } from '../constants';
import type {
  CommonXYLayerConfig,
  CommonXYReferenceLineLayerConfig,
  DataLayerConfig,
  ReferenceLineConfig,
  ReferenceLineLayerConfig,
} from '../types';

export const isDataLayer = (layer: CommonXYLayerConfig): layer is DataLayerConfig =>
  layer.layerType === LayerTypes.DATA;

export const isReferenceLine = (layer: CommonXYLayerConfig): layer is ReferenceLineConfig =>
  layer.type === REFERENCE_LINE;

export const isReferenceLineLayer = (
  layer: CommonXYLayerConfig
): layer is ReferenceLineLayerConfig =>
  layer.layerType === LayerTypes.REFERENCELINE && layer.type === REFERENCE_LINE_LAYER;

export const isReferenceLineOrLayer = (
  layer: CommonXYLayerConfig
): layer is CommonXYReferenceLineLayerConfig => layer.layerType === LayerTypes.REFERENCELINE;

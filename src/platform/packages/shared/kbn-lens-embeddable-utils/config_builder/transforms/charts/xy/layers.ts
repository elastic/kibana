/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getValueColumn } from '../../columns/esql_column';
import type {
  DataLayerType,
  AnnotationLayerType,
  ReferenceLineLayerType,
} from '../../../schema/charts/xy';
import { generateLayer } from '../../utils';
import {
  isAPIesqlXYLayer,
  isAPIXYLayer,
  isAPIAnnotationLayer,
  isAPIReferenceLineLayer,
} from './helpers';

export function getValueColumns(layer: unknown, i: number) {
  if (!isAPIXYLayer(layer) || !isAPIesqlXYLayer(layer)) {
    return [];
  }
  if (isAPIAnnotationLayer(layer)) {
    return [];
  }
  if (isAPIReferenceLineLayer(layer)) {
    return [
      ...layer.thresholds.map((t, index) =>
        getValueColumn(`referenceLine${index}`, t.column, 'number')
      ),
    ];
  }
  return [
    ...(layer.x ? [getValueColumn('x', layer.x.column)] : []),
    ...layer.y.map((y, index) => getValueColumn(`y_${index}`, y.column, 'number')),
    ...(layer.breakdown_by ? [getValueColumn('breakdown', layer.breakdown_by.column)] : []),
  ];
}

// @TODO
function buildDataLayer(
  layer: DataLayerType,
  i: number,
  datasetIndex: { index: string; timeFieldName: string }
) {
  if (!isAPIesqlXYLayer(layer)) {
    return;
  }
  return {
    ...generateLayer(`layer_${i}`, layer),
  };
}

// @TODO
function buildAnnotationLayer(
  layer: AnnotationLayerType,
  i: number,
  datasetIndex: { index: string; timeFieldName: string }
) {
  return {
    ...generateLayer(`annotation_layer_${i}`, layer),
  };
}

// @TODO
function buildReferenceLineLayer(
  layer: ReferenceLineLayerType,
  i: number,
  datasetIndex: { index: string; timeFieldName: string }
) {
  if (!isAPIesqlXYLayer(layer)) {
    return;
  }
  return {
    ...generateLayer(`reference_line_layer_${i}`, layer),
  };
}

export function buildXYLayer(
  layer: unknown,
  i: number,
  datasetIndex: { index: string; timeFieldName: string }
) {
  if (!isAPIXYLayer(layer) || isAPIesqlXYLayer(layer)) {
    return [];
  }

  // now enrich the layer based on its type
  if (isAPIAnnotationLayer(layer)) {
    return buildAnnotationLayer(layer, i, datasetIndex);
  }
  if (isAPIReferenceLineLayer(layer)) {
    return buildReferenceLineLayer(layer, i, datasetIndex);
  }
  return buildDataLayer(layer, i, datasetIndex);
}

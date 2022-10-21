/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { SupportedMetric } from './lib/convert/supported_metrics';
import type { Layer, XYAnnotationsLayerConfig, XYLayerConfig } from './types';

export const isAnnotationsLayer = (
  layer: Pick<XYLayerConfig, 'layerType'>
): layer is XYAnnotationsLayerConfig => layer.layerType === 'annotations';

export const getIndexPatternIds = (layers: Layer[]) =>
  layers.map(({ indexPatternId }) => indexPatternId);

export const isFieldValid = (
  field: DataViewField | undefined,
  aggregation: SupportedMetric
): field is DataViewField => {
  if (!field && aggregation.isFieldRequired) {
    return false;
  }

  if (field && (!field.aggregatable || !aggregation.supportedDataTypes.includes(field.type))) {
    return false;
  }

  return true;
};

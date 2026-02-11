/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewField } from '@kbn/data-views-plugin/common';
import type {
  CollapseFunction,
  NavigateToLensLayer,
  XYLayerConfig,
  XYByValueAnnotationLayerConfig,
} from '@kbn/lens-common';
import { LENS_COLLAPSE_FUNCTIONS } from '@kbn/lens-common';
import type { SupportedMetric } from './lib/convert/supported_metrics';
import type { Column, ColumnWithMeta } from './types';

export const isAnnotationsLayer = (
  layer: Pick<XYLayerConfig, 'layerType'>
): layer is XYByValueAnnotationLayerConfig => layer.layerType === 'annotations';

export const getIndexPatternIds = (layers: NavigateToLensLayer[]) =>
  layers.map(({ indexPatternId }) => indexPatternId);

const isValidFieldType = (
  visType: string,
  { supportedDataTypes }: SupportedMetric,
  field: DataViewField
) => {
  const availableDataTypes = supportedDataTypes[visType] ?? supportedDataTypes.default;
  return availableDataTypes.includes(field.type);
};

export const isFieldValid = (
  visType: string,
  field: DataViewField | undefined,
  aggregation: SupportedMetric
): field is DataViewField => {
  if (!field && aggregation.isFieldRequired) {
    return false;
  }

  if (field && (!field.aggregatable || !isValidFieldType(visType, aggregation, field))) {
    return false;
  }

  return true;
};

export const isCollapseFunction = (candidate: string | undefined): candidate is CollapseFunction =>
  Boolean(candidate && LENS_COLLAPSE_FUNCTIONS.includes(candidate as CollapseFunction));

const isColumnWithMeta = (column: Column): column is ColumnWithMeta => {
  if ((column as ColumnWithMeta).meta) {
    return true;
  }
  return false;
};

export const excludeMetaFromColumn = (column: Column) => {
  if (isColumnWithMeta(column)) {
    const { meta, ...rest } = column;
    return rest;
  }
  return column;
};

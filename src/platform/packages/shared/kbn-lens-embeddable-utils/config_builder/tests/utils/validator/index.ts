/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { validateTransformsFn } from './validate_transforms';
import type { ValidateTransform } from './types';
import type { LensApiConfigByType, LensApiConfigChartType } from '../../../schema';

export const validator: {
  [K in LensApiConfigChartType]: ValidateTransform<LensApiConfigByType[K]>;
} = {
  gauge: validateTransformsFn('gauge'),
  tag_cloud: validateTransformsFn('tag_cloud'),
  metric: validateTransformsFn('metric'),
  legacy_metric: validateTransformsFn('legacy_metric'),
  xy: validateTransformsFn('xy'),
  heatmap: validateTransformsFn('heatmap'),
  region_map: validateTransformsFn('region_map'),
  data_table: validateTransformsFn('data_table'),
  mosaic: validateTransformsFn('mosaic'),
  pie: validateTransformsFn('pie'),
  treemap: validateTransformsFn('treemap'),
  waffle: validateTransformsFn('waffle'),
};

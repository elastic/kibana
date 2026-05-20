/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Type } from '@kbn/config-schema';

import type { LensApiConfigChartType } from '../../../schema';
import {
  datatableConfigSchema,
  regionMapConfigSchema,
  tagcloudConfigSchema,
} from '../../../schema';
import { gaugeConfigSchema } from '../../../schema/charts/gauge';
import { legacyMetricConfigSchema } from '../../../schema/charts/legacy_metric';
import { metricConfigSchema } from '../../../schema/charts/metric';
import { mosaicConfigSchema } from '../../../schema/charts/mosaic';
import { pieConfigSchema } from '../../../schema/charts/pie';
import { treemapConfigSchema } from '../../../schema/charts/treemap';
import { waffleConfigSchema } from '../../../schema/charts/waffle';
import { heatmapConfigSchema } from '../../../schema/charts/heatmap';
import { xyConfigSchema } from '../../../schema/charts/xy';

const compatTypeMap = {
  legacyMetric: 'legacy_metric',
  regionMap: 'region_map',
} satisfies Record<string, LensApiConfigChartType>;

const chartSchemas = {
  gauge: gaugeConfigSchema,
  tag_cloud: tagcloudConfigSchema,
  metric: metricConfigSchema,
  legacy_metric: legacyMetricConfigSchema,
  xy: xyConfigSchema,
  heatmap: heatmapConfigSchema,
  region_map: regionMapConfigSchema,
  data_table: datatableConfigSchema,
  mosaic: mosaicConfigSchema,
  pie: pieConfigSchema,
  treemap: treemapConfigSchema,
  waffle: waffleConfigSchema,
} satisfies Record<LensApiConfigChartType, Type<any>>;

export function getChartSchema(type: string): Type<any> {
  const chartType = (compatTypeMap as any)[type] ?? type;
  const schema = (chartSchemas as any)[chartType];

  if (!schema) {
    throw new Error(`Chart schema not found for type: ${chartType}`);
  }
  return schema;
}

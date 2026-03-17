/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Type } from '@kbn/config-schema';

import type { LensApiStateChartType } from '../../../schema';
import { datatableStateSchema, regionMapStateSchema, tagcloudStateSchema } from '../../../schema';
import { gaugeStateSchema } from '../../../schema/charts/gauge';
import { legacyMetricStateSchema } from '../../../schema/charts/legacy_metric';
import { metricStateSchema } from '../../../schema/charts/metric';
import { mosaicStateSchema } from '../../../schema/charts/mosaic';
import { pieStateSchema } from '../../../schema/charts/pie';
import { treemapStateSchema } from '../../../schema/charts/treemap';
import { waffleStateSchema } from '../../../schema/charts/waffle';
import { heatmapStateSchema } from '../../../schema/charts/heatmap';
import { xyStateSchema } from '../../../schema/charts/xy';

const compatTypeMap = {
  legacyMetric: 'legacy_metric',
  regionMap: 'region_map',
} satisfies Record<string, LensApiStateChartType>;

const chartSchemas = {
  gauge: gaugeStateSchema,
  tagcloud: tagcloudStateSchema,
  metric: metricStateSchema,
  legacy_metric: legacyMetricStateSchema,
  xy: xyStateSchema,
  heatmap: heatmapStateSchema,
  region_map: regionMapStateSchema,
  datatable: datatableStateSchema,
  mosaic: mosaicStateSchema,
  pie: pieStateSchema,
  donut: pieStateSchema,
  treemap: treemapStateSchema,
  waffle: waffleStateSchema,
} satisfies Record<LensApiStateChartType, Type<any>>;

export function getChartSchema(type: string): Type<any> {
  const chartType = (compatTypeMap as any)[type] ?? type;
  const schema = (chartSchemas as any)[chartType];

  if (!schema) {
    throw new Error(`Chart schema not found for type: ${chartType}`);
  }
  return schema;
}

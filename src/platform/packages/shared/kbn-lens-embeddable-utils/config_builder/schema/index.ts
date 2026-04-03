/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { NullableProps, Type } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { MetricState } from './charts/metric';
import { metricStateSchema, metricStateSchemaNoESQL, esqlMetricState } from './charts/metric';
import type { LegacyMetricState } from './charts/legacy_metric';
import { legacyMetricStateSchema, legacyMetricStateSchemaNoESQL } from './charts/legacy_metric';
import type { GaugeState } from './charts/gauge';
import { gaugeStateSchema, gaugeStateSchemaNoESQL, gaugeStateSchemaESQL } from './charts/gauge';
import type { HeatmapState } from './charts/heatmap';
import {
  heatmapStateSchema,
  heatmapStateSchemaNoESQL,
  heatmapStateSchemaESQL,
} from './charts/heatmap';
import type { TagcloudState } from './charts/tagcloud';
import {
  tagcloudStateSchema,
  tagcloudStateSchemaNoESQL,
  tagcloudStateSchemaESQL,
} from './charts/tagcloud';
import type { XYState } from './charts/xy';
import { xyStateSchema, xyStateSchemaESQL } from './charts/xy';
import type { RegionMapState } from './charts/region_map';
import {
  regionMapStateSchema,
  regionMapStateSchemaNoESQL,
  regionMapStateSchemaESQL,
} from './charts/region_map';
import type { DatatableState } from './charts/datatable';
import {
  datatableStateSchema,
  datatableStateSchemaNoESQL,
  datatableStateSchemaESQL,
} from './charts/datatable';
import type {
  LensApiAllMetricOrFormulaOperations,
  LensApiStaticValueOperation,
} from './metric_ops';
import type { LensApiBucketOperations } from './bucket_ops';
import type { MosaicState } from './charts/mosaic';
import { mosaicStateSchema, mosaicStateSchemaNoESQL, mosaicStateSchemaESQL } from './charts/mosaic';
import type { TreemapState } from './charts/treemap';
import {
  treemapStateSchema,
  treemapStateSchemaNoESQL,
  treemapStateSchemaESQL,
} from './charts/treemap';
import type { WaffleState } from './charts/waffle';
import { waffleStateSchema, waffleStateSchemaNoESQL, waffleStateSchemaESQL } from './charts/waffle';
import type { PieState } from './charts/pie';
import { pieStateSchema, pieStateSchemaNoESQL, pieStateSchemaESQL } from './charts/pie';

/**
 * All chart-type schemas
 */
const ALL_CHART_SCHEMAS = [
  metricStateSchemaNoESQL,
  esqlMetricState,
  legacyMetricStateSchemaNoESQL,
  // esqlLegacyMetricState, Not supported yet
  xyStateSchema,
  xyStateSchemaESQL,
  gaugeStateSchemaNoESQL,
  gaugeStateSchemaESQL,
  heatmapStateSchemaNoESQL,
  heatmapStateSchemaESQL,
  tagcloudStateSchemaNoESQL,
  tagcloudStateSchemaESQL,
  regionMapStateSchemaNoESQL,
  regionMapStateSchemaESQL,
  datatableStateSchemaNoESQL,
  datatableStateSchemaESQL,
  pieStateSchemaNoESQL,
  pieStateSchemaESQL,
  mosaicStateSchemaNoESQL,
  mosaicStateSchemaESQL,
  treemapStateSchemaNoESQL,
  treemapStateSchemaESQL,
  waffleStateSchemaNoESQL,
  waffleStateSchemaESQL,
] as const;

/**
 * We need to break the type inference here to avoid exceeding the ts compiler serialization limit.
 *
 * This requires:
 *  - Casting the schema as any
 *  - Defining the `LensApiState` type from the schema types
 *  - Exporting this value as `Type<LensApiState>`
 */
export const _lensApiStateSchema: any = schema.oneOf(
  [
    metricStateSchema,
    legacyMetricStateSchema,
    xyStateSchema,
    gaugeStateSchema,
    heatmapStateSchema,
    tagcloudStateSchema,
    regionMapStateSchema,
    datatableStateSchema,
    pieStateSchema,
    mosaicStateSchema,
    treemapStateSchema,
    waffleStateSchema,
  ],
  { meta: { id: 'lensApiState', title: 'Visualizations' } }
);

export type LensApiState =
  | MetricState
  | LegacyMetricState
  | GaugeState
  | XYState
  | HeatmapState
  | TagcloudState
  | RegionMapState
  | DatatableState
  | PieState
  | MosaicState
  | TreemapState
  | WaffleState;

export const lensApiStateSchema: Type<LensApiState> = _lensApiStateSchema;

/**
 * Extends each chart-type schema with the given panel-level properties (titles, time range, drilldowns, etc.)
 */
export const extendLensApiStateSchemas = <P extends NullableProps>(
  extraProps: P,
  options?: { meta?: Record<string, unknown> }
): Type<LensApiState> =>
  schema.oneOf(ALL_CHART_SCHEMAS.map((s) => s.extends(extraProps)) as any, options);

export type { MetricState, metricStateSchemaNoESQL } from './charts/metric';
export type { LegacyMetricState, legacyMetricStateSchemaNoESQL } from './charts/legacy_metric';
export type { XYState } from './charts/xy';
export type { GaugeState, gaugeStateSchemaNoESQL } from './charts/gauge';
export type { HeatmapState, heatmapStateSchemaNoESQL } from './charts/heatmap';
export type { TagcloudState, TagcloudStateNoESQL, TagcloudStateESQL } from './charts/tagcloud';
export type { RegionMapState, RegionMapStateNoESQL, RegionMapStateESQL } from './charts/region_map';
export type { DatatableState, DatatableStateNoESQL, DatatableStateESQL } from './charts/datatable';
export { tagcloudStateSchema } from './charts/tagcloud';
export { regionMapStateSchema } from './charts/region_map';
export { datatableStateSchema } from './charts/datatable';

export type {
  LensApiFieldMetricOrFormulaOperation,
  LensApiAllMetricOrFormulaOperations,
} from './metric_ops';
export type { LensApiBucketOperations } from './bucket_ops';

export type NarrowByType<T, U> = T extends { type?: U } ? T : never;

export type LensApiAllOperations =
  | LensApiAllMetricOrFormulaOperations
  | LensApiBucketOperations
  | LensApiStaticValueOperation;

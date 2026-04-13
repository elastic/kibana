/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Type } from '@kbn/config-schema';
import type {
  ObjectResultType,
  ObjectType,
  Props,
  TypeOptions,
} from '@kbn/config-schema/src/types';
import type { ObjectUnionType } from './charts/utils/object_union';
import { objectUnion } from './charts/utils/object_union';
import type { MetricState, MetricStateESQL, MetricStateNoESQL } from './charts/metric';
import { esqlMetricState, metricStateSchema, metricStateSchemaNoESQL } from './charts/metric';
import type { LegacyMetricState, LegacyMetricStateNoESQL } from './charts/legacy_metric';
import { legacyMetricStateSchema, legacyMetricStateSchemaNoESQL } from './charts/legacy_metric';
import type { GaugeState, GaugeStateESQL, GaugeStateNoESQL } from './charts/gauge';
import { gaugeStateSchema, gaugeStateSchemaESQL, gaugeStateSchemaNoESQL } from './charts/gauge';
import type { HeatmapState, HeatmapStateESQL, HeatmapStateNoESQL } from './charts/heatmap';
import {
  heatmapStateSchema,
  heatmapStateSchemaESQL,
  heatmapStateSchemaNoESQL,
} from './charts/heatmap';
import type { TagcloudState, TagcloudStateESQL, TagcloudStateNoESQL } from './charts/tagcloud';
import {
  tagcloudStateSchema,
  tagcloudStateSchemaESQL,
  tagcloudStateSchemaNoESQL,
} from './charts/tagcloud';
import type { XYState, XYStateESQL, XYStateNoESQL } from './charts/xy';
import { xyStateSchema, xyStateSchemaESQL, xyStateSchemaNoESQL } from './charts/xy';
import type { RegionMapState, RegionMapStateESQL, RegionMapStateNoESQL } from './charts/region_map';
import {
  regionMapStateSchema,
  regionMapStateSchemaESQL,
  regionMapStateSchemaNoESQL,
} from './charts/region_map';
import type { DatatableState, DatatableStateESQL, DatatableStateNoESQL } from './charts/datatable';
import {
  datatableStateSchema,
  datatableStateSchemaESQL,
  datatableStateSchemaNoESQL,
} from './charts/datatable';
import type {
  LensApiAllMetricOrFormulaOperations,
  LensApiStaticValueOperation,
} from './metric_ops';
import type { LensApiBucketOperations } from './bucket_ops';
import type { MosaicState, MosaicStateESQL, MosaicStateNoESQL } from './charts/mosaic';
import { mosaicStateSchema, mosaicStateSchemaESQL, mosaicStateSchemaNoESQL } from './charts/mosaic';
import type { TreemapState, TreemapStateESQL, TreemapStateNoESQL } from './charts/treemap';
import {
  treemapStateSchema,
  treemapStateSchemaESQL,
  treemapStateSchemaNoESQL,
} from './charts/treemap';
import type { WaffleState, WaffleStateESQL, WaffleStateNoESQL } from './charts/waffle';
import { waffleStateSchema, waffleStateSchemaESQL, waffleStateSchemaNoESQL } from './charts/waffle';
import type { PieState, PieStateESQL, PieStateNoESQL } from './charts/pie';
import { pieStateSchema, pieStateSchemaESQL, pieStateSchemaNoESQL } from './charts/pie';

/**
 * We need to break the type inference here to avoid exceeding the ts compiler serialization limit.
 *
 * This requires:
 *  - Casting the schema as any
 *  - Defining the `LensApiState` type from the schema types
 *  - Exporting this value as `Type<LensApiState>`
 */
export const _lensApiStateSchema: any = objectUnion(
  [
    ...metricStateSchema.getUnionTypes(),
    ...legacyMetricStateSchema.getUnionTypes(),
    ...xyStateSchema.getUnionTypes(),
    ...gaugeStateSchema.getUnionTypes(),
    ...heatmapStateSchema.getUnionTypes(),
    ...tagcloudStateSchema.getUnionTypes(),
    ...regionMapStateSchema.getUnionTypes(),
    ...datatableStateSchema.getUnionTypes(),
    ...pieStateSchema.getUnionTypes(),
    ...mosaicStateSchema.getUnionTypes(),
    ...treemapStateSchema.getUnionTypes(),
    ...waffleStateSchema.getUnionTypes(),
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
 * We need to break the type inference here to avoid exceeding the ts compiler serialization limit.
 *
 * This requires:
 *  - Casting the schema as any
 *  - Defining the `LensApiState` type from the schema types
 *  - Exporting this value as `Type<LensApiState>`
 */
export const _lensApiStateSchemaNoESQL: any = objectUnion(
  [
    metricStateSchemaNoESQL,
    legacyMetricStateSchemaNoESQL,
    xyStateSchemaNoESQL,
    gaugeStateSchemaNoESQL,
    heatmapStateSchemaNoESQL,
    tagcloudStateSchemaNoESQL,
    regionMapStateSchemaNoESQL,
    datatableStateSchemaNoESQL,
    pieStateSchemaNoESQL,
    mosaicStateSchemaNoESQL,
    treemapStateSchemaNoESQL,
    waffleStateSchemaNoESQL,
  ],
  { meta: { id: 'lensApiStateNoESQL', title: 'Visualizations (DSL)' } }
);

export type LensApiStateNoESQL =
  | MetricStateNoESQL
  | LegacyMetricStateNoESQL
  | GaugeStateNoESQL
  | XYStateNoESQL
  | HeatmapStateNoESQL
  | TagcloudStateNoESQL
  | RegionMapStateNoESQL
  | DatatableStateNoESQL
  | PieStateNoESQL
  | MosaicStateNoESQL
  | TreemapStateNoESQL
  | WaffleStateNoESQL;

export const lensApiStateSchemaNoESQL: Type<LensApiStateNoESQL> = _lensApiStateSchemaNoESQL;

/**
 * We need to break the type inference here to avoid exceeding the ts compiler serialization limit.
 *
 * This requires:
 *  - Casting the schema as any
 *  - Defining the `LensApiState` type from the schema types
 *  - Exporting this value as `Type<LensApiState>`
 */
export const _lensApiStateSchemaESQL: any = objectUnion(
  [
    esqlMetricState,
    xyStateSchemaESQL,
    gaugeStateSchemaESQL,
    heatmapStateSchemaESQL,
    tagcloudStateSchemaESQL,
    regionMapStateSchemaESQL,
    datatableStateSchemaESQL,
    pieStateSchemaESQL,
    mosaicStateSchemaESQL,
    treemapStateSchemaESQL,
    waffleStateSchemaESQL,
  ],
  { meta: { id: 'lensApiStateESQL', title: 'Visualizations (ES|QL)' } }
);

export type LensApiStateESQL =
  | MetricStateESQL
  | GaugeStateESQL
  | XYStateESQL
  | HeatmapStateESQL
  | TagcloudStateESQL
  | RegionMapStateESQL
  | DatatableStateESQL
  | PieStateESQL
  | MosaicStateESQL
  | TreemapStateESQL
  | WaffleStateESQL;

export const lensApiStateSchemaESQL: Type<LensApiStateESQL> = _lensApiStateSchemaESQL;

/**
 * Extends `lensApiStateSchema` with extra props and options.
 *
 * This type will be be union of all `LensApiState` intersected with the new props.
 */
export function extendLensApiStateSchema<T extends Props>(
  props: T,
  options?: TypeOptions<LensApiState & T>
): Type<LensApiState & ObjectResultType<T>> {
  // these types are a bit of a hack mainly due to the tsc compiler limit
  // but baseSchema can extend with any props correctly and return the correct `Type` wrapper
  const baseSchema = _lensApiStateSchema as ObjectUnionType<[ObjectType<any>], LensApiState & T>;
  return baseSchema.extends(props, options as any).toType();
}

export type { MetricState, metricStateSchemaNoESQL } from './charts/metric';
export type { LegacyMetricState, legacyMetricStateSchemaNoESQL } from './charts/legacy_metric';
export type { XYState, XYStateNoESQL, XYStateESQL, XYLayer } from './charts/xy';
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

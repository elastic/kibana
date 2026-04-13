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
import type { MetricConfig } from './charts/metric';
import { metricConfigSchema } from './charts/metric';
import type { LegacyMetricConfig } from './charts/legacy_metric';
import { legacyMetricConfigSchema } from './charts/legacy_metric';
import type { GaugeConfig } from './charts/gauge';
import { gaugeConfigSchema } from './charts/gauge';
import type { HeatmapConfig } from './charts/heatmap';
import { heatmapConfigSchema } from './charts/heatmap';
import type { TagcloudConfig } from './charts/tagcloud';
import { tagcloudConfigSchema } from './charts/tagcloud';
import type { XYConfig } from './charts/xy';
import { xyConfigSchema } from './charts/xy';
import type { RegionMapConfig } from './charts/region_map';
import { regionMapConfigSchema } from './charts/region_map';
import type { DatatableConfig } from './charts/datatable';
import { datatableConfigSchema } from './charts/datatable';
import type {
  LensApiAllMetricOrFormulaOperations,
  LensApiStaticValueOperation,
} from './metric_ops';
import type { LensApiBucketOperations } from './bucket_ops';
import type { MosaicConfig } from './charts/mosaic';
import { mosaicConfigSchema } from './charts/mosaic';
import type { TreemapConfig } from './charts/treemap';
import { treemapConfigSchema } from './charts/treemap';
import type { WaffleConfig } from './charts/waffle';
import { waffleConfigSchema } from './charts/waffle';
import type { PieConfig } from './charts/pie';
import { pieConfigSchema } from './charts/pie';

/**
 * We need to break the type inference here to avoid exceeding the ts compiler serialization limit.
 *
 * This requires:
 *  - Casting the schema as any
 *  - Defining the `LensApiConfig` type from the schema types
 *  - Exporting this value as `Type<LensApiConfig>`
 */
export const _lensApiConfigSchema: any = objectUnion(
  [
    ...metricConfigSchema.getUnionTypes(),
    ...legacyMetricConfigSchema.getUnionTypes(),
    ...xyConfigSchema.getUnionTypes(),
    ...gaugeConfigSchema.getUnionTypes(),
    ...heatmapConfigSchema.getUnionTypes(),
    ...tagcloudConfigSchema.getUnionTypes(),
    ...regionMapConfigSchema.getUnionTypes(),
    ...datatableConfigSchema.getUnionTypes(),
    ...pieConfigSchema.getUnionTypes(),
    ...mosaicConfigSchema.getUnionTypes(),
    ...treemapConfigSchema.getUnionTypes(),
    ...waffleConfigSchema.getUnionTypes(),
  ],
  { meta: { id: 'lensApiConfig', title: 'Visualizations' } }
);

export type LensApiConfig =
  | MetricConfig
  | LegacyMetricConfig
  | GaugeConfig
  | XYConfig
  | HeatmapConfig
  | TagcloudConfig
  | RegionMapConfig
  | DatatableConfig
  | PieConfig
  | MosaicConfig
  | TreemapConfig
  | WaffleConfig;

export const lensApiConfigSchema: Type<LensApiConfig> = _lensApiConfigSchema;

/**
 * Extends `lensApiConfigSchema` with extra props and options.
 *
 * This type will be be union of all `LensApiConfig` intersected with the new props.
 */
export function extendLensApiConfigSchema<T extends Props>(
  props: T,
  options?: TypeOptions<LensApiConfig & T>
): Type<LensApiConfig & ObjectResultType<T>> {
  // these types are a bit of a hack mainly due to the tsc compiler limit
  // but baseSchema can extend with any props correctly and return the correct `Type` wrapper
  const baseSchema = _lensApiConfigSchema as ObjectUnionType<[ObjectType<any>], LensApiConfig & T>;
  return baseSchema.extends(props, options as any).toType();
}

export type { MetricConfig, metricConfigSchemaNoESQL } from './charts/metric';
export type { LegacyMetricConfig, legacyMetricConfigSchemaNoESQL } from './charts/legacy_metric';
export type { XYConfig, XYConfigNoESQL, XYConfigESQL, XYLayer } from './charts/xy';
export type { GaugeConfig, gaugeConfigSchemaNoESQL } from './charts/gauge';
export type { HeatmapConfig, heatmapConfigSchemaNoESQL } from './charts/heatmap';
export type { TagcloudConfig, TagcloudConfigNoESQL, TagcloudConfigESQL } from './charts/tagcloud';
export type {
  RegionMapConfig,
  RegionMapConfigNoESQL,
  RegionMapConfigESQL,
} from './charts/region_map';
export type {
  DatatableConfig,
  DatatableConfigNoESQL,
  DatatableConfigESQL,
} from './charts/datatable';
export { tagcloudConfigSchema } from './charts/tagcloud';
export { regionMapConfigSchema } from './charts/region_map';
export { datatableConfigSchema } from './charts/datatable';

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

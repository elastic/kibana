import type { Type } from '@kbn/config-schema';
import type { ObjectResultType, Props, TypeOptions } from '@kbn/config-schema/src/types';
import type { MetricConfig, MetricConfigESQL, MetricConfigNoESQL } from './charts/metric';
import { metricConfigSchema, metricConfigSchemaESQL, metricConfigSchemaNoESQL } from './charts/metric';
import type { LegacyMetricConfig, LegacyMetricConfigNoESQL } from './charts/legacy_metric';
import { legacyMetricConfigSchema, legacyMetricConfigSchemaNoESQL } from './charts/legacy_metric';
import type { GaugeConfig, GaugeConfigESQL, GaugeConfigNoESQL } from './charts/gauge';
import { gaugeConfigSchema, gaugeConfigSchemaESQL, gaugeConfigSchemaNoESQL } from './charts/gauge';
import type { HeatmapConfig, HeatmapConfigESQL, HeatmapConfigNoESQL } from './charts/heatmap';
import { heatmapConfigSchema, heatmapConfigSchemaESQL, heatmapConfigSchemaNoESQL } from './charts/heatmap';
import type { TagcloudConfig, TagcloudConfigESQL, TagcloudConfigNoESQL } from './charts/tagcloud';
import { tagcloudConfigSchema, tagcloudConfigSchemaESQL, tagcloudConfigSchemaNoESQL } from './charts/tagcloud';
import type { XYConfig, XYConfigESQL, XYConfigNoESQL, XYLegendOutsideHorizontal, XYLegendOutsideVertical, XYLegendInside, XYLegendStatistic, XYLegendSize } from './charts/xy';
import { xyConfigSchema, xyConfigSchemaESQL, xyConfigSchemaNoESQL } from './charts/xy';
import type { RegionMapConfig, RegionMapConfigESQL, RegionMapConfigNoESQL } from './charts/region_map';
import { regionMapConfigSchema, regionMapConfigSchemaESQL, regionMapConfigSchemaNoESQL } from './charts/region_map';
import type { DatatableConfig, DatatableConfigESQL, DatatableConfigNoESQL } from './charts/datatable';
import { datatableConfigSchema, datatableConfigSchemaESQL, datatableConfigSchemaNoESQL } from './charts/datatable';
import type { LensApiAllMetricOrFormulaOperations, LensApiStaticValueOperation } from './metric_ops';
import type { LensApiBucketOperations } from './bucket_ops';
import type { MosaicConfig, MosaicConfigESQL, MosaicConfigNoESQL } from './charts/mosaic';
import { mosaicConfigSchema, mosaicConfigSchemaESQL, mosaicConfigSchemaNoESQL } from './charts/mosaic';
import type { TreemapConfig, TreemapConfigESQL, TreemapConfigNoESQL } from './charts/treemap';
import { treemapConfigSchema, treemapConfigSchemaESQL, treemapConfigSchemaNoESQL } from './charts/treemap';
import type { WaffleConfig, WaffleConfigESQL, WaffleConfigNoESQL } from './charts/waffle';
import { waffleConfigSchema, waffleConfigSchemaESQL, waffleConfigSchemaNoESQL } from './charts/waffle';
import type { PieConfig, PieConfigESQL, PieConfigNoESQL } from './charts/pie';
import { pieConfigSchema, pieConfigSchemaESQL, pieConfigSchemaNoESQL } from './charts/pie';
/**
 * We need to break the type inference here to avoid exceeding the ts compiler serialization limit.
 *
 * This requires:
 *  - Casting the schema as any
 *  - Defining the `LensApiConfig` type from the schema types
 *  - Exporting this value as `Type<LensApiConfig>`
 */
export declare const _lensApiConfigSchema: any;
export type LensApiConfig = MetricConfig | LegacyMetricConfig | GaugeConfig | XYConfig | HeatmapConfig | TagcloudConfig | RegionMapConfig | DatatableConfig | PieConfig | MosaicConfig | TreemapConfig | WaffleConfig;
export declare const lensApiConfigSchema: Type<LensApiConfig>;
/**
 * We need to break the type inference here to avoid exceeding the ts compiler serialization limit.
 *
 * This requires:
 *  - Casting the schema as any
 *  - Defining the `LensApiConfig` type from the schema types
 *  - Exporting this value as `Type<LensApiConfig>`
 */
export declare const _lensApiConfigSchemaNoESQL: any;
export type LensApiConfigNoESQL = MetricConfigNoESQL | LegacyMetricConfigNoESQL | GaugeConfigNoESQL | XYConfigNoESQL | HeatmapConfigNoESQL | TagcloudConfigNoESQL | RegionMapConfigNoESQL | DatatableConfigNoESQL | PieConfigNoESQL | MosaicConfigNoESQL | TreemapConfigNoESQL | WaffleConfigNoESQL;
export declare const lensApiConfigSchemaNoESQL: Type<LensApiConfigNoESQL>;
/**
 * We need to break the type inference here to avoid exceeding the ts compiler serialization limit.
 *
 * This requires:
 *  - Casting the schema as any
 *  - Defining the `LensApiConfig` type from the schema types
 *  - Exporting this value as `Type<LensApiConfig>`
 */
export declare const _lensApiConfigSchemaESQL: any;
export type LensApiConfigESQL = MetricConfigESQL | GaugeConfigESQL | XYConfigESQL | HeatmapConfigESQL | TagcloudConfigESQL | RegionMapConfigESQL | DatatableConfigESQL | PieConfigESQL | MosaicConfigESQL | TreemapConfigESQL | WaffleConfigESQL;
export declare const lensApiConfigSchemaESQL: Type<LensApiConfigESQL>;
/**
 * Extends `lensApiConfigSchema` with extra props and options.
 *
 * This type will be be union of all `LensApiConfig` intersected with the new props.
 */
export declare function extendLensApiConfigSchema<T extends Props>(props: T, options?: TypeOptions<LensApiConfig & T>): Type<LensApiConfig & ObjectResultType<T>>;
export type { LensApiFieldMetricOrFormulaOperation, LensApiAllMetricOrFormulaOperations, } from './metric_ops';
export type { LensApiBucketOperations } from './bucket_ops';
export type { XYLayer } from './charts/xy';
export type NarrowByType<T, U> = T extends {
    type?: U;
} ? T : never;
export type LensApiAllOperations = LensApiAllMetricOrFormulaOperations | LensApiBucketOperations | LensApiStaticValueOperation;
/**
 * Supported chart types in the Lens API
 *
 * @note snake cased
 */
export type LensApiConfigChartType = LensApiConfig['type'];
/**
 * Map of Lens API state types to their corresponding config type
 */
export type LensApiConfigByType = {
    [K in LensApiConfig['type']]: Extract<LensApiConfig, {
        type: K;
    }>;
};
export { metricConfigSchema, legacyMetricConfigSchema, gaugeConfigSchema, tagcloudConfigSchema, xyConfigSchema, regionMapConfigSchema, heatmapConfigSchema, datatableConfigSchema, pieConfigSchema, treemapConfigSchema, waffleConfigSchema, mosaicConfigSchema, metricConfigSchemaESQL, gaugeConfigSchemaESQL, tagcloudConfigSchemaESQL, xyConfigSchemaESQL, regionMapConfigSchemaESQL, heatmapConfigSchemaESQL, datatableConfigSchemaESQL, pieConfigSchemaESQL, treemapConfigSchemaESQL, waffleConfigSchemaESQL, mosaicConfigSchemaESQL, metricConfigSchemaNoESQL, legacyMetricConfigSchemaNoESQL, gaugeConfigSchemaNoESQL, tagcloudConfigSchemaNoESQL, xyConfigSchemaNoESQL, regionMapConfigSchemaNoESQL, heatmapConfigSchemaNoESQL, datatableConfigSchemaNoESQL, pieConfigSchemaNoESQL, treemapConfigSchemaNoESQL, waffleConfigSchemaNoESQL, mosaicConfigSchemaNoESQL, };
export type { MetricConfig, LegacyMetricConfig, GaugeConfig, TagcloudConfig, XYConfig, RegionMapConfig, HeatmapConfig, DatatableConfig, PieConfig, TreemapConfig, WaffleConfig, MosaicConfig, MetricConfigESQL, GaugeConfigESQL, TagcloudConfigESQL, XYConfigESQL, RegionMapConfigESQL, HeatmapConfigESQL, DatatableConfigESQL, PieConfigESQL, TreemapConfigESQL, WaffleConfigESQL, MosaicConfigESQL, MetricConfigNoESQL, LegacyMetricConfigNoESQL, GaugeConfigNoESQL, TagcloudConfigNoESQL, XYConfigNoESQL, RegionMapConfigNoESQL, HeatmapConfigNoESQL, DatatableConfigNoESQL, PieConfigNoESQL, TreemapConfigNoESQL, WaffleConfigNoESQL, MosaicConfigNoESQL, XYLegendOutsideHorizontal, XYLegendOutsideVertical, XYLegendInside, XYLegendStatistic, XYLegendSize, };

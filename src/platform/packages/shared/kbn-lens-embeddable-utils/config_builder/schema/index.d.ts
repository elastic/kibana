import type { Type } from '@kbn/config-schema';
import type { MetricState } from './charts/metric';
import type { LegacyMetricState } from './charts/legacy_metric';
import type { GaugeState } from './charts/gauge';
import type { HeatmapState } from './charts/heatmap';
import type { TagcloudState } from './charts/tagcloud';
import type { XYState } from './charts/xy';
import type { RegionMapState } from './charts/region_map';
import type { DatatableState } from './charts/datatable';
import type { LensApiAllMetricOrFormulaOperations, LensApiStaticValueOperation } from './metric_ops';
import type { LensApiBucketOperations } from './bucket_ops';
import type { MosaicState } from './charts/mosaic';
import type { TreemapState } from './charts/treemap';
import type { WaffleState } from './charts/waffle';
import type { PieState } from './charts/pie';
/**
 * We need to break the type inference here to avoid exceeding the ts compiler serialization limit.
 *
 * This requires:
 *  - Casting the schema as any
 *  - Defining the `LensApiState` type from the schema types
 *  - Exporting this value as `Type<LensApiState>`
 */
export declare const _lensApiStateSchema: any;
export type LensApiState = MetricState | LegacyMetricState | GaugeState | XYState | HeatmapState | TagcloudState | RegionMapState | DatatableState | PieState | MosaicState | TreemapState | WaffleState;
export declare const lensApiStateSchema: Type<LensApiState>;
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
export type { LensApiFieldMetricOrFormulaOperation, LensApiAllMetricOrFormulaOperations, } from './metric_ops';
export type { LensApiBucketOperations } from './bucket_ops';
export type NarrowByType<T, U> = T extends {
    type?: U;
} ? T : never;
export type LensApiAllOperations = LensApiAllMetricOrFormulaOperations | LensApiBucketOperations | LensApiStaticValueOperation;

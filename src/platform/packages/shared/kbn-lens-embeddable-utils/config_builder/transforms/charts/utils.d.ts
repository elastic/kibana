import type { TypeOf } from '@kbn/config-schema';
import type { FormBasedLayer, GaugeVisualizationState, HeatmapVisualizationState, XYVisualizationState, MetricVisualizationState, SharedPartitionLayerState, TextBasedLayer } from '@kbn/lens-common';
import type { LensAttributes } from '../../types';
import type { LensApiConfig } from '../../schema';
import type { legendTruncateAfterLinesSchema } from '../../schema/shared';
import type { APIAdHocDataView, APIDataView } from '../columns/types';
import type { AnyMetricLensStateColumn } from '../columns/types';
import type { XScaleSchemaType } from '../../schema/charts/shared';
export declare function getSharedChartLensStateToAPI(config: Pick<LensAttributes, 'title' | 'description'>): Pick<LensApiConfig, 'title' | 'description'>;
export declare function getSharedChartAPIToLensState(config: {
    title?: string;
    description?: string;
}): {
    description?: string | undefined;
    title: string;
};
export declare function getMetricAccessor(visualization: GaugeVisualizationState | MetricVisualizationState): any;
export declare function getDatasourceLayers(state: LensAttributes['state']): Record<string, Omit<FormBasedLayer, 'indexPatternId'> | TextBasedLayer>;
export declare function getLensStateLayer(layers: Record<string, Omit<FormBasedLayer, 'indexPatternId'> | TextBasedLayer>, visLayerId: string | undefined): [string, Omit<FormBasedLayer, "indexPatternId"> | TextBasedLayer];
type OptionalProperties<T extends Record<string, any> | undefined> = Pick<T, {
    [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T]>;
/**
 * Strips out undefined properties from an object.
 *
 * Pass only properties that can be undefined.
 */
export declare function stripUndefined<T extends Record<string, any> | undefined>(obj: OptionalProperties<T>): OptionalProperties<T>;
export declare function getDataViewsMetadata(usedDataviews: Record<string, APIDataView | APIAdHocDataView>): {
    adHocDataViews: Record<string, import("@kbn/data-views-plugin/common").DataViewSpec>;
    internalReferences: import("@kbn/core/server").SavedObjectReference[];
    references: import("@kbn/core/server").SavedObjectReference[];
    dataViewLayerToIdMap: Record<string, string>;
};
/**
 * Processes converted metric columns and their optional reference columns,
 * assigning IDs.
 */
export declare function processMetricColumnsWithReferences<T extends AnyMetricLensStateColumn>(convertedMetrics: T[][], getAccessorName: (index: number) => string, getRefAccessorName: (index: number) => string): Array<{
    column: T;
    id: string;
}>;
type LegendTruncateAfterLines = TypeOf<typeof legendTruncateAfterLinesSchema>;
export declare function getLegendTruncateAfterLines(legend: Pick<XYVisualizationState['legend'], 'shouldTruncate' | 'maxLines'> | Pick<HeatmapVisualizationState['legend'], 'shouldTruncate' | 'maxLines'> | Pick<SharedPartitionLayerState, 'truncateLegend' | 'legendMaxLines'>): LegendTruncateAfterLines;
type ExtendsNumber<N, Yes, No> = N extends number ? Yes : No;
/**
 * Used to map enum values from api to state and vice versa.
 */
export declare function getReversibleMappings<API extends string | number | undefined, State extends string | number | undefined>(entries: readonly [API, State][]): {
    toState: {
        (value: ExtendsNumber<API, number, API>): ExtendsNumber<API, State | undefined, State>;
        (value?: ExtendsNumber<API, number, API>): State | undefined;
    };
    toAPI: {
        (value: ExtendsNumber<State, number, State>): ExtendsNumber<State, API | undefined, API>;
        (value?: ExtendsNumber<State, number, State>): API | undefined;
    };
};
/**
 * Determines the x-axis scale type based on column metadata type.
 * Returns 'temporal' for date columns, 'linear' for numeric columns, and 'ordinal' for others.
 */
export declare function getScaleTypeFromColumnType(columnType: string | undefined): XScaleSchemaType;
/**
 * Determines the column metadata type based on the API x-axis scale type.
 */
export declare function getColumnTypeFromScaleType(scaleType: XScaleSchemaType): 'date' | 'number' | 'string';
export {};

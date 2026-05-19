import type { MappingTimeSeriesMetricType } from '@elastic/elasticsearch/lib/api/types';
import type { ES_FIELD_TYPES } from '@kbn/field-types';
import type { LensSeriesLayer } from '@kbn/lens-embeddable-utils';
import type { Dimension, NullableMetricUnit } from '../../../types';
/**
 * Narrow input describing only the metric fields that `useChartLayers` actually reads.
 * Decouples the hook from the wider `ParsedMetricItem` domain type so non-metrics-explorer
 * call sites (e.g. trace charts) do not need to fabricate unrelated fields.
 */
interface ChartLayerMetricInput {
    metricName: string;
    readonly metricTypes: MappingTimeSeriesMetricType[];
    readonly units: NullableMetricUnit[];
    readonly fieldTypes: ES_FIELD_TYPES[];
}
interface UseChartLayersParams {
    dimensions?: Dimension[];
    metricItem: ChartLayerMetricInput;
    color?: string;
    seriesType?: LensSeriesLayer['seriesType'];
    customFunction?: string;
}
/**
 * A hook that computes the Lens series layer configuration for the metrics chart.
 * Properly normalizes metric units to ensure they are displayed correctly in the chart
 * (e.g., 'byte' -> 'bytes', handling multiple units over time).
 */
export declare const useChartLayers: ({ dimensions, metricItem, color, seriesType, customFunction, }: UseChartLayersParams) => LensSeriesLayer[];
export {};

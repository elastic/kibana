import type { LensSeriesLayer } from '@kbn/lens-embeddable-utils';
import type { MetricUnit } from '../../../types';
interface TraceChart {
    id: string;
    title: string;
    color: string;
    unit: MetricUnit;
    seriesType: LensSeriesLayer['seriesType'];
    esqlQuery: string;
}
interface TraceQueryParams {
    indexes: string;
    filters: string[];
    metadataFields: string[];
    breakdownField?: string;
}
export declare function getErrorRateChart({ indexes, filters, metadataFields, breakdownField, }: TraceQueryParams): TraceChart | null;
export declare function getLatencyChart({ indexes, filters, metadataFields, breakdownField, }: TraceQueryParams): TraceChart | null;
export declare function getThroughputChart({ indexes, filters, metadataFields, breakdownField, }: TraceQueryParams): TraceChart | null;
export {};

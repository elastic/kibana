import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { AggTypesDependencies } from '../../..';
export declare function inferTimeZone(params: {
    field?: DataViewField | string;
    time_zone?: string;
}, dataView: DataView, aggName: 'date_histogram' | 'date_range', getConfig: AggTypesDependencies['getConfig'], { shouldDetectTimeZone }?: AggTypesDependencies['aggExecutionContext']): string;

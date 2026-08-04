import type { Moment } from 'moment';
import type { RangeFilterParams } from '@kbn/es-query';
import type { IAggConfig } from '../aggs';
/** @internal **/
export interface TabbedRangeFilterParams extends RangeFilterParams {
    name: string;
}
/** @internal */
export interface TimeRangeInformation {
    from?: Moment;
    to?: Moment;
    timeFields: string[];
}
export interface TabbedResponseWriterOptions {
    metricsAtAllLevels: boolean;
    partialRows: boolean;
    timeRange?: TimeRangeInformation;
}
/** @internal */
export interface AggResponseBucket {
    key_as_string: string;
    key: number;
    doc_count: number;
}
/** @public **/
export interface TabbedAggColumn {
    aggConfig: IAggConfig;
    id: string;
    name: string;
    hasPrecisionError?: boolean;
}
/** @public **/
export type TabbedAggRow = Record<TabbedAggColumn['id'], string | number>;

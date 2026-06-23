import type { SerializableRecord } from '@kbn/utility-types';
export declare const DATA_QUALITY_LOCATOR_ID = "DATA_QUALITY_LOCATOR";
type RefreshInterval = {
    pause: boolean;
    value: number;
};
type TimeRangeConfig = {
    from: string;
    to: string;
    refresh: RefreshInterval;
};
type Filters = {
    timeRange: TimeRangeConfig;
};
export interface DataQualityLocatorParams extends SerializableRecord {
    filters?: Filters;
}
export {};

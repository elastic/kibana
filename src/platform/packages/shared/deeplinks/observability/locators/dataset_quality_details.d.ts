import type { SerializableRecord } from '@kbn/utility-types';
export declare const DATA_QUALITY_DETAILS_LOCATOR_ID = "DATA_QUALITY_DETAILS_LOCATOR";
type RefreshInterval = {
    pause: boolean;
    value: number;
};
type TimeRangeConfig = {
    from: string;
    to: string;
    refresh: RefreshInterval;
};
type DegradedFieldsTable = {
    page?: number;
    rowsPerPage?: number;
    sort?: {
        field: string;
        direction: 'asc' | 'desc';
    };
};
export interface DataQualityDetailsLocatorParams extends SerializableRecord {
    dataStream: string;
    timeRange?: TimeRangeConfig;
    breakdownField?: string;
    degradedFields?: {
        table?: DegradedFieldsTable;
    };
    expandedDegradedField?: string;
    showCurrentQualityIssues?: boolean;
}
export {};

import type { SerializableRecord } from '@kbn/utility-types';
export declare const uptimeOverviewLocatorID = "UPTIME_OVERVIEW_LOCATOR";
export interface UptimeOverviewLocatorInfraParams extends SerializableRecord {
    ip?: string;
    host?: string;
    container?: string;
    pod?: string;
}
export interface UptimeOverviewLocatorParams extends SerializableRecord {
    dateRangeStart?: string;
    dateRangeEnd?: string;
    search?: string;
}

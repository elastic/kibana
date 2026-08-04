import type { DataView } from '@kbn/data-plugin/common';
import type { AggregateQuery, Filter, Query } from '@kbn/es-query';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
export interface Params {
    dataView?: DataView;
    query?: Query | AggregateQuery;
    filters?: Filter[];
    services: {
        data: DataPublicPluginStart;
        uiSettings: IUiSettingsClient;
    };
}
export declare enum TimeRangeExtendingStatus {
    initial = "initial",
    loading = "loading",
    succeedWithResults = "succeedWithResults",
    succeedWithoutResults = "succeedWithoutResults",
    failed = "failed",
    timedOut = "timedOut"
}
export interface OccurrencesRange {
    from: string;
    to: string;
}
interface OccurrencesRangeFetchResult {
    status: TimeRangeExtendingStatus;
    range?: OccurrencesRange;
}
export interface Result {
    fetch: () => Promise<OccurrencesRangeFetchResult>;
}
export declare const useFetchOccurrencesRange: (params: Params) => Result;
export {};

import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { FieldStatsResponse } from '../../types';
interface FetchFieldStatsParams {
    services: {
        data: DataPublicPluginStart;
    };
    dataView: DataView;
    field: DataViewField;
    fromDate: string;
    toDate: string;
    dslQuery: object;
    size?: number;
    abortController?: AbortController;
}
export type LoadFieldStatsHandler = (params: FetchFieldStatsParams) => Promise<FieldStatsResponse<string | number>>;
/**
 * Loads and aggregates stats data for a data view field
 * @param services
 * @param dataView
 * @param field
 * @param fromDate
 * @param toDate
 * @param dslQuery
 * @param size
 * @param abortController
 */
export declare const loadFieldStats: LoadFieldStatsHandler;
export {};

import type { HttpSetup } from '@kbn/core/public';
import type { ProjectRouting } from '@kbn/es-query';
import type { GetFieldsOptions, IDataViewsApiClient } from '../../common';
/**
 * Helper function to get the request body for the getFieldsForWildcard request
 * @param options options for fields request
 * @returns string | undefined
 */
export declare function getFieldsForWildcardRequestBody(options: GetFieldsOptions): string | undefined;
/**
 * Data Views API Client - client implementation
 */
export declare class DataViewsApiClient implements IDataViewsApiClient {
    private http;
    private getCurrentUserId;
    private getGlobalProjectRouting?;
    /**
     * constructor
     * @param http http dependency
     * @param getCurrentUserId function that returns the current user id
     * @param getGlobalProjectRouting function that returns the global project routing, used if override is not provided in the options of a request
     */
    constructor(http: HttpSetup, getCurrentUserId: () => Promise<string | undefined>, getGlobalProjectRouting?: () => ProjectRouting);
    private _request;
    private _getUrl;
    /**
     * Get field list for a given index pattern
     * @param options options for fields request
     */
    getFieldsForWildcard(options: GetFieldsOptions): Promise<{
        indices: string[];
        fields: {
            name: string;
            type: string;
            script?: string | undefined;
            subType?: import("@kbn/es-query").IFieldSubType | undefined;
            lang?: import("@elastic/elasticsearch/lib/api/types").ScriptLanguage | undefined;
            scripted?: boolean | undefined;
            esTypes?: string[] | undefined;
            indexed?: boolean | undefined;
            timeZone?: string[] | undefined;
            isNull?: boolean | undefined;
            searchable: boolean;
            isComputedColumn?: boolean | undefined;
            conflictDescriptions?: Record<string, string[]> | undefined;
            aggregatable: boolean;
            readFromDocValues?: boolean | undefined;
            fixedInterval?: string[] | undefined;
            timeSeriesDimension?: boolean | undefined;
            timeSeriesMetric?: import("@elastic/elasticsearch/lib/api/types").MappingTimeSeriesMetricType | undefined;
            shortDotsEnable?: boolean | undefined;
            isMapped?: boolean | undefined;
            parentName?: string | undefined;
            defaultFormatter?: string | undefined;
            metadata_field?: boolean | undefined;
        }[];
        etag: string;
    }>;
    /**
     * Does a user created data view exist?
     */
    hasUserDataView(): Promise<boolean>;
}

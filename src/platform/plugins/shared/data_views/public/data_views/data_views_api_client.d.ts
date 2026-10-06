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
            subType?: import("@kbn/es-query").IFieldSubType;
            script?: string;
            lang?: import("@elastic/elasticsearch/lib/api/types").ScriptLanguage;
            scripted?: boolean;
            esTypes?: string[];
            conflictDescriptions?: Record<string, string[]>;
            searchable: boolean;
            aggregatable: boolean;
            isNull?: boolean;
            isComputedColumn?: boolean;
            readFromDocValues?: boolean;
            indexed?: boolean;
            fixedInterval?: string[];
            timeZone?: string[];
            timeSeriesDimension?: boolean;
            timeSeriesMetric?: import("@elastic/elasticsearch/lib/api/types").MappingTimeSeriesMetricType;
            shortDotsEnable?: boolean;
            isMapped?: boolean;
            parentName?: string;
            defaultFormatter?: string;
            metadata_field?: boolean;
        }[];
        etag: string;
    }>;
    /**
     * Does a user created data view exist?
     */
    hasUserDataView(): Promise<boolean>;
}

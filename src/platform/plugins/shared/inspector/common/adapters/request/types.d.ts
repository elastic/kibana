import type { ConnectionRequestParams } from '@elastic/transport';
/**
 * The status a request can have.
 */
export declare enum RequestStatus {
    /**
     * The request hasn't finished yet.
     */
    PENDING = 0,
    /**
     * The request has successfully finished.
     */
    OK = 1,
    /**
     * The request failed.
     */
    ERROR = 2
}
export interface Request extends RequestParams {
    id: string;
    name: string;
    json?: object;
    response?: Response;
    startTime: number;
    stats?: RequestStatistics;
    status: RequestStatus;
    time?: number;
}
export interface RequestParams {
    id?: string;
    description?: string;
    searchSessionId?: string;
}
export interface RequestStatistics {
    [key: string]: RequestStatistic;
}
export interface RequestStatistic {
    label: string;
    description?: string;
    value: any;
}
export interface Response {
    json?: object;
    requestParams?: ConnectionRequestParams;
    time?: number;
}

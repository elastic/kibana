import type { HttpSetup } from '@kbn/core-http-browser';
import type { BaseResponseType } from '../../../types';
export interface RequestArgs {
    http: HttpSetup;
    requests: Array<{
        url: string;
        method: string;
        data: string[];
        lineNumber?: number;
    }>;
    host?: string;
    isPackagedEnvironment?: boolean;
}
export interface ResponseObject<V = unknown> {
    statusCode: number;
    statusText: string;
    timeMs: number;
    contentType: BaseResponseType;
    value: V;
}
export interface RequestResult<V = unknown> {
    request: {
        data: string;
        method: string;
        path: string;
    };
    response: ResponseObject<V>;
}
export declare function sendRequest(args: RequestArgs): Promise<RequestResult[]>;

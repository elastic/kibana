import type { ServerSentEventBase } from './events';
import { ServerSentEventType } from './events';
export declare enum ServerSentEventErrorCode {
    internalError = "internalError",
    requestError = "requestError"
}
export declare class ServerSentEventError<TCode extends string, TMeta extends Record<string, any> | undefined> extends Error {
    code: TCode;
    meta: TMeta;
    constructor(code: TCode, message: string, meta: TMeta);
    get status(): number | undefined;
    toJSON(): ServerSentErrorEvent;
}
export type ServerSentErrorEvent = ServerSentEventBase<ServerSentEventType.error, {
    error: {
        code: string;
        message: string;
        meta?: Record<string, any>;
    };
}>;
export type ServerSentEventInternalError = ServerSentEventError<ServerSentEventErrorCode.internalError, {}>;
export type ServerSentEventRequestError = ServerSentEventError<ServerSentEventErrorCode.requestError, {
    status: number;
}>;
export declare function createSSEInternalError(message?: string): ServerSentEventInternalError;
export declare function createSSERequestError(message: string, status: number): ServerSentEventRequestError;
export declare function isSSEError(error: unknown): error is ServerSentEventError<string, Record<string, any> | undefined>;
export declare function isSSEInternalError(error: unknown): error is ServerSentEventInternalError;
export declare function isSSERequestError(error: unknown): error is ServerSentEventRequestError;

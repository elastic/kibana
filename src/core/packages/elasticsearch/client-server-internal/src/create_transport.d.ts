import { Transport, type TransportRequestParams, type TransportRequestOptions } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { InternalUnauthorizedErrorHandler } from './retry_unauthorized';
/**
 * Timing context stored in Transport request options for instrumentation
 * @internal
 */
export interface TimingContext {
    startTime: number;
    kibanaRequest: KibanaRequest;
}
/**
 * Extended context type for Transport request options
 * @internal
 */
export interface TransportContext {
    cpsRoutingContext?: any;
    timingContext?: TimingContext;
}
type TransportClass = typeof Transport;
export type ErrorHandlerAccessor = () => InternalUnauthorizedErrorHandler;
export interface OnRequestContext {
    scoped: boolean;
}
export type OnRequestHandler = (ctx: OnRequestContext, params: TransportRequestParams, options: TransportRequestOptions, logger: Logger) => void;
export declare const createTransport: ({ scoped, getExecutionContext, getUnauthorizedErrorHandler, onRequest, logger, }: {
    scoped?: boolean;
    getExecutionContext?: () => string | undefined;
    getUnauthorizedErrorHandler?: ErrorHandlerAccessor;
    onRequest: OnRequestHandler;
    logger: Logger;
}) => TransportClass;
export {};

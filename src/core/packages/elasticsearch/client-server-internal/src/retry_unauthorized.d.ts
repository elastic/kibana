import type { MaybePromise } from '@kbn/utility-types';
import type { UnauthorizedError } from '@kbn/es-errors';
import type { SetAuthHeaders } from '@kbn/core-http-server';
import type { ScopeableRequest, UnauthorizedErrorHandler, UnauthorizedErrorHandlerResult, UnauthorizedErrorHandlerToolkit, UnauthorizedErrorHandlerRetryResult, UnauthorizedErrorHandlerNotHandledResult } from '@kbn/core-elasticsearch-server';
/** @internal */
export type InternalUnauthorizedErrorHandler = (error: UnauthorizedError) => MaybePromise<UnauthorizedErrorHandlerResult>;
/** @internal */
export declare const toolkit: UnauthorizedErrorHandlerToolkit;
/**
 * Converts the public version of `UnauthorizedErrorHandler` to the internal one used by the ES client
 *
 * @internal
 */
export declare const createInternalErrorHandler: ({ getHandler, request, setAuthHeaders, }: {
    getHandler: () => UnauthorizedErrorHandler | undefined;
    request: ScopeableRequest;
    setAuthHeaders: SetAuthHeaders;
}) => InternalUnauthorizedErrorHandler;
export declare const isRetryResult: (result: UnauthorizedErrorHandlerResult) => result is UnauthorizedErrorHandlerRetryResult;
export declare const isNotHandledResult: (result: UnauthorizedErrorHandlerResult) => result is UnauthorizedErrorHandlerNotHandledResult;

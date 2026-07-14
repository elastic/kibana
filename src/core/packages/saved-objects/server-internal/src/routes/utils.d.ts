import type { Readable } from 'stream';
import type { KibanaRequest, RequestHandlerWrapper } from '@kbn/core-http-server';
import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import type { Logger } from '@kbn/logging';
export declare function createSavedObjectsStreamFromNdJson(ndJsonStream: Readable): Promise<Readable>;
export declare function validateTypes(types: string[], supportedTypes: string[]): string | undefined;
export declare function validateObjects(objects: Array<{
    id: string;
    type: string;
}>, supportedTypes: string[]): string | undefined;
/**
 * Catches errors thrown by saved object route handlers and returns an error
 * with the payload and statusCode of the boom error.
 *
 * This is very close to the core `router.handleLegacyErrors` except that it
 * throws internal errors (statusCode: 500) so that the internal error's
 * message get logged by Core.
 *
 * TODO: Remove once https://github.com/elastic/kibana/issues/65291 is fixed.
 */
export declare const catchAndReturnBoomErrors: RequestHandlerWrapper;
/**
 *
 * @param {string[]} exposedVisibleTypes all registered types with hidden:false and hiddenFromHttpApis:false|undefined
 * @param {string[]} typesToCheck saved object types provided to the httpApi request
 */
export declare function throwOnGloballyHiddenTypes(allHttpApisVisibleTypes: string[], typesToCheck: string[]): void;
/**
 * @param {string[]} unsupportedTypes saved object types registered with hidden=false and hiddenFromHttpApis=true
 */
export declare function throwOnHttpHiddenTypes(unsupportedTypes: string[]): void;
/**
 * @param {string[]} type saved object type
 * @param {ISavedObjectTypeRegistry} registry the saved object type registry
 */
export declare function throwIfTypeNotVisibleByAPI(type: string, registry: ISavedObjectTypeRegistry): void;
export declare function throwIfAnyTypeNotVisibleByAPI(typesToCheck: string[], registry: ISavedObjectTypeRegistry): void;
export interface BulkGetItem {
    type: string;
    id: string;
    fields?: string[];
    namespaces?: string[];
}
export declare function isKibanaRequest({ headers }: KibanaRequest): string | string[] | undefined;
export interface LogWarnOnExternalRequest {
    method: string;
    path: string;
    request: KibanaRequest;
    logger: Logger;
}
/**
 * Only log a warning when the request is internal
 * Allows us to silence the logs for development
 *  @internal
 */
export declare function logWarnOnExternalRequest(params: LogWarnOnExternalRequest): void;

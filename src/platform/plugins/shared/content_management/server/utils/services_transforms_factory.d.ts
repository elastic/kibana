import type { Version } from '@kbn/object-versioning';
import type { StorageContextGetTransformFn } from '../core';
export declare const disableCache: () => void;
/**
 * Wrap the "getContentManagementServicesTransforms()" handler from the @kbn/object-versioning package
 * to be able to cache the service definitions compilations so we can reuse them accross request as the
 * services definitions won't change until a new Elastic version is released. In which case the cache
 * will be cleared.
 *
 * @param contentTypeId The content type id for the service definition
 * @returns A "getContentManagementServicesTransforms()"
 */
export declare const getServiceObjectTransformFactory: (contentTypeId: string, _requestVersion: Version) => StorageContextGetTransformFn;

import type { Version } from '@kbn/object-versioning';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { FavoritesSetup } from '@kbn/content-management-favorites-server';
import type { CoreApi, StorageContextGetTransformFn } from './core';
export type { IContentClient } from './content_client/types';
export interface ContentManagementServerSetupDependencies {
    usageCollection?: UsageCollectionSetup;
}
export interface ContentManagementServerStartDependencies {
}
export interface ContentManagementServerSetup extends CoreApi {
    favorites: FavoritesSetup;
}
export interface ContentManagementServerStart {
}
export type GetTransformsFactoryFn = (contentTypeId: string, requestVersion: Version, options?: {
    cacheEnabled?: boolean;
}) => StorageContextGetTransformFn;

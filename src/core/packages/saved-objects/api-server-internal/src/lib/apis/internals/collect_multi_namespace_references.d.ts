import type { SavedObjectsCollectMultiNamespaceReferencesObject, SavedObjectsCollectMultiNamespaceReferencesOptions, SavedObjectsCollectMultiNamespaceReferencesResponse } from '@kbn/core-saved-objects-api-server';
import { type ISavedObjectsSecurityExtension, type ISavedObjectTypeRegistry, type ISavedObjectsSerializer } from '@kbn/core-saved-objects-server';
import type { CreatePointInTimeFinderFn } from '../../point_in_time_finder';
import type { RepositoryEsClient } from '../../repository_es_client';
/**
 * How many aliases or objects with shared origins to search for per page. This is smaller than the PointInTimeFinder's default of 1000. We
 * specify 100 for the page count because this is a relatively unimportant operation, and we want to avoid blocking the Elasticsearch thread
 * pool for longer than necessary.
 *
 * @internal
 */
export declare const ALIAS_OR_SHARED_ORIGIN_SEARCH_PER_PAGE = 100;
/**
 * Parameters for the collectMultiNamespaceReferences function.
 *
 * @internal
 */
export interface CollectMultiNamespaceReferencesParams {
    registry: ISavedObjectTypeRegistry;
    allowedTypes: string[];
    client: RepositoryEsClient;
    serializer: ISavedObjectsSerializer;
    getIndexForType: (type: string) => string;
    createPointInTimeFinder: CreatePointInTimeFinderFn;
    securityExtension: ISavedObjectsSecurityExtension | undefined;
    objects: SavedObjectsCollectMultiNamespaceReferencesObject[];
    options?: SavedObjectsCollectMultiNamespaceReferencesOptions;
}
/**
 * Gets all references and transitive references of the given objects. Ignores any object and/or reference that is not a multi-namespace
 * type.
 *
 * @internal
 */
export declare function collectMultiNamespaceReferences(params: CollectMultiNamespaceReferencesParams): Promise<SavedObjectsCollectMultiNamespaceReferencesResponse>;

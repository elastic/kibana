import type { Logger } from '@kbn/logging';
import { type SavedObjectsUpdateObjectsSpacesObject, type SavedObjectsUpdateObjectsSpacesOptions, type SavedObjectsUpdateObjectsSpacesResponse } from '@kbn/core-saved-objects-api-server';
import type { ISavedObjectsSecurityExtension, ISavedObjectTypeRegistry, ISavedObjectsSerializer } from '@kbn/core-saved-objects-server';
import type { IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
import type { RepositoryEsClient } from '../../repository_es_client';
/**
 * Parameters for the updateObjectsSpaces function.
 *
 * @internal
 */
export interface UpdateObjectsSpacesParams {
    mappings: IndexMapping;
    registry: ISavedObjectTypeRegistry;
    allowedTypes: string[];
    client: RepositoryEsClient;
    serializer: ISavedObjectsSerializer;
    logger: Logger;
    getIndexForType: (type: string) => string;
    securityExtension: ISavedObjectsSecurityExtension | undefined;
    objects: SavedObjectsUpdateObjectsSpacesObject[];
    spacesToAdd: string[];
    spacesToRemove: string[];
    options?: SavedObjectsUpdateObjectsSpacesOptions;
}
/**
 * Gets all references and transitive references of the given objects. Ignores any object and/or reference that is not a multi-namespace
 * type.
 */
export declare function updateObjectsSpaces({ mappings, registry, allowedTypes, client, serializer, logger, getIndexForType, securityExtension, objects, spacesToAdd, spacesToRemove, options, }: UpdateObjectsSpacesParams): Promise<SavedObjectsUpdateObjectsSpacesResponse>;

import type { Logger } from '@kbn/logging';
import type { ISavedObjectTypeRegistry, SavedObjectsExtensions, ISavedObjectsSerializer } from '@kbn/core-saved-objects-server';
import type { IKibanaMigrator, IndexMapping } from '@kbn/core-saved-objects-base-server-internal';
import type { RepositoryHelpers } from './helpers';
import type { RepositoryEsClient } from '../repository_es_client';
/**
 * Context passed from the SO repository to the API execution handlers.
 *
 * @internal
 */
export interface ApiExecutionContext {
    registry: ISavedObjectTypeRegistry;
    helpers: RepositoryHelpers;
    extensions: SavedObjectsExtensions;
    client: RepositoryEsClient;
    allowedTypes: string[];
    serializer: ISavedObjectsSerializer;
    migrator: IKibanaMigrator;
    logger: Logger;
    mappings: IndexMapping;
}

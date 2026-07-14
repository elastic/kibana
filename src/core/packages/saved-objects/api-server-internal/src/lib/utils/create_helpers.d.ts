import type { Logger } from '@kbn/logging';
import type { IKibanaMigrator, SavedObjectsSerializer } from '@kbn/core-saved-objects-base-server-internal';
import type { ISavedObjectTypeRegistry, SavedObjectsExtensions } from '@kbn/core-saved-objects-server';
import type { RepositoryHelpers } from '../apis/helpers';
import type { RepositoryEsClient } from '../repository_es_client';
import type { CreatePointInTimeFinderFn } from '../point_in_time_finder';
interface CreateRepositoryHelpersOptions {
    index: string;
    client: RepositoryEsClient;
    typeRegistry: ISavedObjectTypeRegistry;
    serializer: SavedObjectsSerializer;
    migrator: IKibanaMigrator;
    logger: Logger;
    extensions?: SavedObjectsExtensions;
    createPointInTimeFinder: CreatePointInTimeFinderFn;
}
export declare const createRepositoryHelpers: ({ logger, extensions, index, client, typeRegistry, serializer, migrator, createPointInTimeFinder, }: CreateRepositoryHelpersOptions) => RepositoryHelpers;
export {};

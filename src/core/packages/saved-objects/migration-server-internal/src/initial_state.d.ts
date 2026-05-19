import type { DocLinksServiceStart } from '@kbn/core-doc-links-server';
import type { Logger } from '@kbn/logging';
import type { ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import type { IndexMapping, IndexTypesMap, SavedObjectsMigrationConfigType } from '@kbn/core-saved-objects-base-server-internal';
import type { ElasticsearchCapabilities } from '@kbn/core-elasticsearch-server';
import { type OutdatedDocumentsQueryParams } from './get_outdated_documents_query';
import type { InitState } from './state';
export interface CreateInitialStateParams extends OutdatedDocumentsQueryParams {
    kibanaVersion: string;
    waitForMigrationCompletion: boolean;
    mustRelocateDocuments: boolean;
    indexTypes: string[];
    indexTypesMap: IndexTypesMap;
    hashToVersionMap: Record<string, string>;
    targetIndexMappings: IndexMapping;
    preMigrationScript?: string;
    indexPrefix: string;
    migrationsConfig: SavedObjectsMigrationConfigType;
    typeRegistry: ISavedObjectTypeRegistry;
    docLinks: DocLinksServiceStart;
    logger: Logger;
    esCapabilities: ElasticsearchCapabilities;
}
/**
 * Construct the initial state for the model
 */
export declare const createInitialState: ({ kibanaVersion, waitForMigrationCompletion, mustRelocateDocuments, indexTypes, indexTypesMap, hashToVersionMap, targetIndexMappings, preMigrationScript, coreMigrationVersionPerType, migrationVersionPerType, indexPrefix, migrationsConfig, typeRegistry, docLinks, logger, esCapabilities, }: CreateInitialStateParams) => InitState;

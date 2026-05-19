import type { NodeRoles } from '@kbn/core-node-server';
import type { Logger } from '@kbn/logging';
import type { DocLinksServiceStart } from '@kbn/core-doc-links-server';
import type { ElasticsearchCapabilities, ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';
import { type IKibanaMigrator, type IndexMapping, type IndexTypesMap, type ISavedObjectTypeRegistryInternal, type KibanaMigratorStatus, type MigrateDocumentOptions, type MigrationResult, type SavedObjectsMigrationConfigType } from '@kbn/core-saved-objects-base-server-internal';
import { DocumentMigrator } from './document_migrator';
export interface KibanaMigratorOptions {
    client: ElasticsearchClient;
    typeRegistry: ISavedObjectTypeRegistryInternal;
    defaultIndexTypesMap: IndexTypesMap;
    hashToVersionMap: Record<string, string>;
    soMigrationsConfig: SavedObjectsMigrationConfigType;
    kibanaIndex: string;
    kibanaVersion: string;
    logger: Logger;
    docLinks: DocLinksServiceStart;
    waitForMigrationCompletion: boolean;
    nodeRoles: NodeRoles;
    esCapabilities: ElasticsearchCapabilities;
    /** Specify a minimum supported Kibana version, e.g. '8.18.0' */
    kibanaVersionCheck?: string;
}
/**
 * Manages the shape of mappings and documents in the Kibana index.
 */
export declare class KibanaMigrator implements IKibanaMigrator {
    private readonly client;
    private readonly documentMigrator;
    private readonly kibanaIndex;
    private readonly log;
    private readonly mappingProperties;
    private readonly typeRegistry;
    private readonly defaultIndexTypesMap;
    private readonly hashToVersionMap;
    private readonly serializer;
    private migrationResult?;
    private readonly status$;
    private readonly soMigrationMeter;
    private readonly activeMappings;
    private readonly soMigrationsConfig;
    private readonly docLinks;
    private readonly waitForMigrationCompletion;
    private readonly nodeRoles;
    private readonly esCapabilities;
    readonly kibanaVersion: string;
    readonly kibanaVersionCheck: string | undefined;
    /**
     * Creates an instance of KibanaMigrator.
     */
    constructor({ client, typeRegistry, kibanaIndex, defaultIndexTypesMap, hashToVersionMap, soMigrationsConfig, kibanaVersion, logger, docLinks, waitForMigrationCompletion, nodeRoles, esCapabilities, kibanaVersionCheck, }: KibanaMigratorOptions);
    getDocumentMigrator(): DocumentMigrator;
    runMigrations({ rerun, skipVersionCheck, }?: {
        rerun?: boolean;
        skipVersionCheck?: boolean;
    }): Promise<MigrationResult[]>;
    prepareMigrations(): void;
    getStatus$(): import("rxjs").Observable<KibanaMigratorStatus>;
    private runMigrationsInternal;
    getActiveMappings(): IndexMapping;
    migrateDocument(doc: SavedObjectUnsanitizedDoc, { allowDowngrade }?: MigrateDocumentOptions): SavedObjectUnsanitizedDoc;
}

import type { ElasticsearchClient, ElasticsearchCapabilities } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsMigrationConfigType, MigrationResult, IDocumentMigrator } from '@kbn/core-saved-objects-base-server-internal';
import type { ISavedObjectTypeRegistry, ISavedObjectsSerializer } from '@kbn/core-saved-objects-server';
import type { Logger } from '@kbn/logging';
import type { DocLinksServiceStart } from '@kbn/core-doc-links-server';
import type { NodeRoles } from '@kbn/core-node-server';
export interface MigrateIndexOptions {
    kibanaVersion: string;
    indexPrefix: string;
    types: string[];
    /** The SO type registry to use for the migration */
    typeRegistry: ISavedObjectTypeRegistry;
    /** Logger to use for migration output */
    logger: Logger;
    /** The document migrator to use to convert the document */
    documentMigrator: IDocumentMigrator;
    /** The migration config to use for the migration */
    migrationConfig: SavedObjectsMigrationConfigType;
    /** docLinks contract to use to link to documentation */
    docLinks: DocLinksServiceStart;
    /** SO serializer to use for migration */
    serializer: ISavedObjectsSerializer;
    /** The client to use for communications with ES */
    elasticsearchClient: ElasticsearchClient;
    /** The node roles of the Kibana instance */
    readonly nodeRoles: NodeRoles;
    /** Capabilities of the ES cluster we're using */
    esCapabilities: ElasticsearchCapabilities;
}
export declare const migrateIndex: ({ logger, ...options }: MigrateIndexOptions) => Promise<MigrationResult>;

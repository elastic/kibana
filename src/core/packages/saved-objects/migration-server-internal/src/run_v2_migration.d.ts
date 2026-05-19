import type { Logger } from '@kbn/logging';
import type { DocLinksServiceStart } from '@kbn/core-doc-links-server';
import type { ElasticsearchClient, ElasticsearchCapabilities } from '@kbn/core-elasticsearch-server';
import type { ISavedObjectTypeRegistry, ISavedObjectsSerializer } from '@kbn/core-saved-objects-server';
import { type IndexTypesMap, type MigrationResult, type SavedObjectsMigrationConfigType, type SavedObjectsTypeMappingDefinitions } from '@kbn/core-saved-objects-base-server-internal';
import type { Histogram } from '@opentelemetry/api';
import type { DocumentMigrator } from './document_migrator';
export interface RunV2MigrationOpts {
    /** The current Kibana version */
    kibanaVersion: string;
    /** The default Kibana SavedObjects index prefix. e.g `.kibana` */
    kibanaIndexPrefix: string;
    /** The SO type registry to use for the migration */
    typeRegistry: ISavedObjectTypeRegistry;
    /** The map of indices => types to use as a default / baseline state */
    defaultIndexTypesMap: IndexTypesMap;
    /** A map that holds [last md5 used => modelVersion] for each of the SO types */
    hashToVersionMap: Record<string, string>;
    /** Logger to use for migration output */
    logger: Logger;
    /** The document migrator to use to convert the document */
    documentMigrator: DocumentMigrator;
    /** docLinks contract to use to link to documentation */
    docLinks: DocLinksServiceStart;
    /** SO serializer to use for migration */
    serializer: ISavedObjectsSerializer;
    /** The client to use for communications with ES */
    elasticsearchClient: ElasticsearchClient;
    /** The configuration that drives the behavior of each migrator */
    migrationConfig: SavedObjectsMigrationConfigType;
    /** The definitions of the different saved object types */
    mappingProperties: SavedObjectsTypeMappingDefinitions;
    /** Tells whether this instance should actively participate in the migration or not */
    waitForMigrationCompletion: boolean;
    /** Capabilities of the ES cluster we're using */
    esCapabilities: ElasticsearchCapabilities;
    /** If we are upgrading from an older Kibana, ensure that the previous version is at least the specified value (e.g. kibanaVersionCheck: '8.18.0') */
    kibanaVersionCheck: string | undefined;
    /** The OTel Histogram metric to record the duration of each migrator */
    meter: Histogram;
}
export declare const runV2Migration: (options: RunV2MigrationOpts) => Promise<MigrationResult[]>;

import type { Logger } from '@kbn/logging';
import type { DocLinksServiceStart } from '@kbn/core-doc-links-server';
import type { NodeRoles } from '@kbn/core-node-server';
import type { ElasticsearchClient, ElasticsearchCapabilities } from '@kbn/core-elasticsearch-server';
import type { ISavedObjectTypeRegistry, ISavedObjectsSerializer } from '@kbn/core-saved-objects-server';
import type { SavedObjectsMigrationConfigType, MigrationResult, IDocumentMigrator } from '@kbn/core-saved-objects-base-server-internal';
import type { Histogram } from '@opentelemetry/api/build/src/metrics/Metric';
export interface RunZeroDowntimeMigrationOpts {
    /** The current Kibana version */
    kibanaVersion: string;
    /** The Kibana system index prefix. e.g `.kibana` or `.kibana_task_manager` */
    kibanaIndexPrefix: string;
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
    nodeRoles: NodeRoles;
    /** Capabilities of the ES cluster we're using */
    esCapabilities: ElasticsearchCapabilities;
    /** The OTel Histogram metric to record the duration of each migrator */
    meter: Histogram;
}
export declare const runZeroDowntimeMigration: (options: RunZeroDowntimeMigrationOpts) => Promise<MigrationResult[]>;

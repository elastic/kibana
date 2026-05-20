import type { ElasticsearchClient, Logger } from '@kbn/core/server';
export interface RollDataStreamIfRequiredParams {
    logger: Logger;
    esClient: ElasticsearchClient;
    dataStreamName: string;
    targetManagedIndexMappingsVersion: number;
}
/**
 * Schedules a lazy rollover when backing indices lack the target
 * `mappings._meta.managed_index_mappings_version`.
 *
 * The `managed_index_mappings_version` value is read from Elasticsearch backing-index
 * mappings (`_meta`); Kibana does not stamp it here—it compares the deployed value to
 * a local target constant to decide whether to call rollover.
 */
export declare function rollDataStreamIfRequired({ logger, esClient, dataStreamName, targetManagedIndexMappingsVersion, }: RollDataStreamIfRequiredParams): Promise<boolean>;

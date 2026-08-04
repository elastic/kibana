import type { ElasticsearchClient } from '../elasticsearch_client';
/**
 * This function is similar to getIndexExists, but is limited to searching indices that match
 * the index pattern used as concrete backing indices (e.g. .siem-signals-default-000001).
 * This allows us to separate the indices that are actually .siem-signals indices from
 * alerts as data indices that only share the .siem-signals alias.
 *
 * @param esClient Elasticsearch client to use to make the request
 * @param index Index alias name to check for existence
 */
export declare const getBootstrapIndexExists: (esClient: ElasticsearchClient, index: string) => Promise<boolean>;

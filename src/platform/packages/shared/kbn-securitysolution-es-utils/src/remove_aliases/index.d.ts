import type { ElasticsearchClient } from '../elasticsearch_client';
/**
 * Removes all but the specified alias from the concrete index(es) specified by said alias. Necessary when migrating an index to a data stream, as that index may only have one alias (name of data stream that going to be created)

 * @param alias The name of the alias to be preserved
 * @param esClient
 */
export declare const removeAliases: (esClient: ElasticsearchClient, alias: string) => Promise<unknown>;

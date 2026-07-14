import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
declare const methods: readonly ["bulk", "closePointInTime", "create", "delete", "get", "index", "mget", "openPointInTime", "search", "update", "updateByQuery"];
type MethodName = (typeof methods)[number];
export type RepositoryEsClient = Pick<ElasticsearchClient, MethodName | 'transport'>;
export declare function createRepositoryEsClient(client: ElasticsearchClient): RepositoryEsClient;
export {};

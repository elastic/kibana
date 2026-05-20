import type { Client } from '@elastic/elasticsearch';
/**
 * Client used to query the elasticsearch cluster.
 * @deprecated At some point use the one from src/core/server/elasticsearch/client/types.ts when it is made into a package. If it never is, then keep using this one.
 * @public
 */
export type ElasticsearchClient = Omit<Client, 'connectionPool' | 'serializer' | 'extend' | 'child' | 'close' | 'diagnostic'>;

import type { ServiceToken } from '@kbn/core-di';
import type { AsScopedOptions, ElasticsearchClient as IElasticsearchClient, IScopedClusterClient } from '@kbn/core-elasticsearch-server';
/**
 * Factory type for creating parameterized scoped cluster client instances.
 * @see {@link IScopedClusterClient}
 * @public
 */
export type IScopedClusterClientFactory = (options?: AsScopedOptions) => IScopedClusterClient;
/**
 * The Elasticsearch client authenticated as the user of the current HTTP request.
 * @public
 */
export declare const ElasticsearchClient: ServiceToken<IElasticsearchClient>;
/**
 * The Elasticsearch client authenticated as the internal Kibana user.
 * @public
 */
export declare const InternalElasticsearchClient: ServiceToken<IElasticsearchClient>;
/**
 * The Elasticsearch cluster client scoped to the current HTTP request.
 * @see {@link IScopedClusterClient}
 * @public
 */
export declare const ScopedClusterClient: ServiceToken<IScopedClusterClient>;
/**
 * The cluster client factory that constructs a scoped client instance in the current HTTP request context.
 * @public
 */
export declare const ScopedClusterClientFactory: ServiceToken<IScopedClusterClientFactory>;

import type { ClientOptions } from '@elastic/elasticsearch';
import type { ElasticsearchClientConfig } from '@kbn/core-elasticsearch-server';
import type { AgentOptions } from 'https';
export type ParsedClientOptions = Omit<ClientOptions, 'agent'> & {
    agent: AgentOptions;
};
/**
 * Parse the client options from given client config and `scoped` flag.
 *
 * @param config The config to generate the client options from.
 * @param scoped if true, will adapt the configuration to be used by a scoped client
 *        (will remove basic auth and ssl certificates)
 */
export declare function parseClientOptions(config: ElasticsearchClientConfig, scoped: boolean, kibanaVersion: string): ParsedClientOptions;

import { Client } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClientConfig } from '@kbn/core-elasticsearch-server';
import { type OnRequestHandler } from './create_transport';
import type { AgentFactoryProvider } from './agent_manager';
export declare const configureClient: (config: ElasticsearchClientConfig, { logger, type, scoped, getExecutionContext, agentFactoryProvider, kibanaVersion, onRequest, }: {
    logger: Logger;
    type: string;
    scoped?: boolean;
    getExecutionContext?: () => string | undefined;
    agentFactoryProvider: AgentFactoryProvider;
    kibanaVersion: string;
    onRequest: OnRequestHandler;
}) => Client;

import type { Client } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';
import type { IAuthHeadersStorage } from '@kbn/core-http-server';
import type { ScopeableRequest, ScopeableUrlRequest, UnauthorizedErrorHandler, ICustomClusterClient, IScopedClusterClient, ElasticsearchClientConfig, AsScopedOptions } from '@kbn/core-elasticsearch-server';
import type { InternalSecurityServiceSetup } from '@kbn/core-security-server-internal';
import { type OnRequestHandler } from './create_transport';
import type { AgentFactoryProvider } from './agent_manager';
export type { OnRequestHandler };
interface CommonFactoryRoutingOpts {
    logger: Logger;
    request?: ScopeableUrlRequest;
}
interface ScopedFactoryRoutingOpts extends CommonFactoryRoutingOpts {
    projectRouting: 'space';
    request: ScopeableUrlRequest;
}
/**
 * Union of routing options passed to {@link OnRequestHandlerFactory}.
 * The scoped variant carries the request so the factory can extract the space NPRE.
 * @internal
 */
export type FactoryRoutingOpts = CommonFactoryRoutingOpts | ScopedFactoryRoutingOpts;
/**
 * A factory that produces an {@link OnRequestHandler}, which can be bound to a request context.
 * @internal
 */
export type OnRequestHandlerFactory = (opts: FactoryRoutingOpts) => OnRequestHandler;
/** @internal **/
export declare class ClusterClient implements ICustomClusterClient {
    private readonly config;
    private readonly authHeaders?;
    private readonly security?;
    private readonly rootScopedClient;
    private readonly kibanaVersion;
    private readonly logger;
    private readonly getUnauthorizedErrorHandler;
    private readonly getExecutionContext;
    private readonly onRequestHandlerFactory;
    private isClosed;
    readonly asInternalUser: Client;
    constructor({ config, logger, type, authHeaders, security, getExecutionContext, getUnauthorizedErrorHandler, agentFactoryProvider, kibanaVersion, onRequestHandlerFactory, }: {
        config: ElasticsearchClientConfig;
        logger: Logger;
        type: string;
        authHeaders?: IAuthHeadersStorage;
        security?: InternalSecurityServiceSetup;
        getExecutionContext?: () => string | undefined;
        getUnauthorizedErrorHandler?: () => UnauthorizedErrorHandler | undefined;
        agentFactoryProvider: AgentFactoryProvider;
        kibanaVersion: string;
        onRequestHandlerFactory: OnRequestHandlerFactory;
    });
    asScoped(request: ScopeableRequest): IScopedClusterClient;
    asScoped(request: ScopeableUrlRequest, opts: AsScopedOptions): IScopedClusterClient;
    close(): Promise<void>;
    private createInternalErrorHandlerAccessor;
    private getScopedHeaders;
    private getSecondaryAuthHeaders;
}

import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import type { InternalExecutionContextSetup } from '@kbn/core-execution-context-server-internal';
import type { InternalHttpServiceSetup } from '@kbn/core-http-server-internal';
import type { InternalSecurityServiceSetup } from '@kbn/core-security-server-internal';
import type { ILoggingSystem } from '@kbn/core-logging-server-internal';
import type { InternalElasticsearchServicePreboot, InternalElasticsearchServiceSetup, InternalElasticsearchServiceStart } from './types';
export interface SetupDeps {
    analytics: AnalyticsServiceSetup;
    http: InternalHttpServiceSetup;
    executionContext: InternalExecutionContextSetup;
    security: InternalSecurityServiceSetup;
    loggingSystem: Pick<ILoggingSystem, 'setGlobalContext'>;
}
/** @internal */
export declare class ElasticsearchService implements CoreService<InternalElasticsearchServiceSetup, InternalElasticsearchServiceStart> {
    private readonly coreContext;
    private readonly log;
    private readonly config$;
    private readonly isServerless;
    private onRequestHandlerFactory;
    private esTimingEnabled;
    private stop$;
    private kibanaVersion;
    private authHeaders?;
    private executionContextClient?;
    private esNodesCompatibility$?;
    private client?;
    private clusterInfo$?;
    private unauthorizedErrorHandler?;
    private agentManager?;
    private security?;
    constructor(coreContext: CoreContext);
    preboot(): Promise<InternalElasticsearchServicePreboot>;
    setup(deps: SetupDeps): Promise<InternalElasticsearchServiceSetup>;
    start(): Promise<InternalElasticsearchServiceStart>;
    stop(): Promise<void>;
    private createClusterClient;
    private getAgentManager;
}

import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import type { InternalExecutionContextSetup } from '@kbn/core-execution-context-server-internal';
import type { InternalUserActivityServiceSetup } from '@kbn/core-user-activity-server-internal';
import type { InternalContextSetup, InternalContextPreboot } from '@kbn/core-http-context-server-internal';
import type { DocLinksServicePreboot } from '@kbn/core-doc-links-server';
import type { InternalHttpServicePreboot, InternalHttpServiceSetup, InternalHttpServiceStart } from './types';
export interface PrebootDeps {
    context: InternalContextPreboot;
    docLinks: DocLinksServicePreboot;
}
export interface SetupDeps {
    context: InternalContextSetup;
    executionContext: InternalExecutionContextSetup;
    userActivity: InternalUserActivityServiceSetup;
}
/** @internal */
export declare class HttpService implements CoreService<InternalHttpServiceSetup, InternalHttpServiceStart> {
    private readonly coreContext;
    private static readonly generateOasSemaphore;
    private readonly prebootServer;
    private isPrebootServerStopped;
    private readonly httpServer;
    private readonly httpsRedirectServer;
    private readonly config$;
    private configSubscription?;
    private readonly log;
    private readonly env;
    private internalPreboot?;
    private internalSetup?;
    private requestHandlerContext?;
    constructor(coreContext: CoreContext);
    preboot(deps: PrebootDeps): Promise<InternalHttpServicePreboot>;
    setup(deps: SetupDeps): Promise<InternalHttpServiceSetup>;
    getStartContract(): InternalHttpServiceStart;
    start(): Promise<InternalHttpServiceStart>;
    private generateOas;
    private registerOasApi;
    /**
     * Indicates if http server is configured to start listening on a configured port.
     * (if `server.autoListen` is not explicitly set to `false`.)
     *
     * @internal
     * */
    private shouldListen;
    stop(): Promise<void>;
}

import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import type { IRouter } from '@kbn/core-http-server';
import type { InternalHttpServiceSetup, InternalHttpServicePreboot } from '@kbn/core-http-server-internal';
import type { InternalRenderingServicePreboot, InternalRenderingServiceSetup } from '@kbn/core-rendering-server-internal';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { HttpResources } from '@kbn/core-http-resources-server';
import type { InternalHttpResourcesSetup } from './types';
/**
 * @internal
 */
export interface PrebootDeps {
    http: InternalHttpServicePreboot;
    rendering: InternalRenderingServicePreboot;
}
/**
 * @internal
 */
export interface SetupDeps {
    http: InternalHttpServiceSetup;
    rendering: InternalRenderingServiceSetup;
}
export declare class HttpResourcesService implements CoreService<InternalHttpResourcesSetup> {
    private readonly logger;
    constructor(core: CoreContext);
    preboot(deps: PrebootDeps): {
        createRegistrar: (router: IRouter<RequestHandlerContext>) => HttpResources;
    };
    setup(deps: SetupDeps): {
        createRegistrar: (router: IRouter<RequestHandlerContext>) => HttpResources;
    };
    start(): void;
    stop(): void;
    private createRegistrar;
    private createResponseToolkit;
}

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityRequestHandlerContext, AuthcRequestHandlerContext, AuditRequestHandlerContext } from '@kbn/core-security-server';
import type { InternalSecurityServiceStart } from './internal_contracts';
export declare class CoreSecurityRouteHandlerContext implements SecurityRequestHandlerContext {
    #private;
    private readonly securityStart;
    private readonly request;
    constructor(securityStart: InternalSecurityServiceStart, request: KibanaRequest);
    get authc(): AuthcRequestHandlerContext;
    get audit(): AuditRequestHandlerContext;
}

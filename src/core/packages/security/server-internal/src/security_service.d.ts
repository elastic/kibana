import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import type { InternalSecurityServiceSetup, InternalSecurityServiceStart } from './internal_contracts';
export declare class SecurityService implements CoreService<InternalSecurityServiceSetup, InternalSecurityServiceStart> {
    private readonly log;
    private securityApi?;
    private config$;
    private configSubscription?;
    private config;
    private readonly getConfig;
    constructor(coreContext: CoreContext);
    setup(): InternalSecurityServiceSetup;
    start(): InternalSecurityServiceStart;
    stop(): void;
}

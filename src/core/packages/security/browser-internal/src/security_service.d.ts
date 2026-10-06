import type { CoreContext, CoreService } from '@kbn/core-base-browser-internal';
import type { InternalSecurityServiceSetup, InternalSecurityServiceStart } from './internal_contracts';
export declare class SecurityService implements CoreService<InternalSecurityServiceSetup, InternalSecurityServiceStart> {
    private readonly log;
    private securityApi?;
    constructor(coreContext: CoreContext);
    setup(): InternalSecurityServiceSetup;
    start(): InternalSecurityServiceStart;
    stop(): void;
}

import type { CoreContext } from '@kbn/core-base-server-internal';
import type { InternalHttpServicePreboot, InternalHttpServiceSetup } from '@kbn/core-http-server-internal';
import type { CapabilitiesStart, CapabilitiesSetup } from '@kbn/core-capabilities-server';
interface PrebootSetupDeps {
    http: InternalHttpServicePreboot;
}
interface SetupDeps {
    http: InternalHttpServiceSetup;
}
/** @internal */
export declare class CapabilitiesService {
    private readonly logger;
    private readonly capabilitiesProviders;
    private readonly capabilitiesSwitchers;
    private readonly resolveCapabilities;
    private started;
    constructor(core: CoreContext);
    preboot(prebootDeps: PrebootSetupDeps): void;
    setup(setupDeps: SetupDeps): CapabilitiesSetup;
    start(): CapabilitiesStart;
}
export {};

import type { RecursiveReadonly } from '@kbn/utility-types';
import type { InternalHttpStart } from '@kbn/core-http-browser-internal';
import type { Capabilities } from '@kbn/core-capabilities-common';
interface StartDeps {
    appIds: string[];
    http: InternalHttpStart;
}
/** @internal */
export interface CapabilitiesStart {
    capabilities: RecursiveReadonly<Capabilities>;
}
/**
 * Service that is responsible for UI Capabilities.
 * @internal
 */
export declare class CapabilitiesService {
    start({ appIds, http }: StartDeps): Promise<CapabilitiesStart>;
}
export {};

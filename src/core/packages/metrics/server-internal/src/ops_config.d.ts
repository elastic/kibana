import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
import type { Duration } from 'moment';
/** @internal */
export declare const OPS_CONFIG_PATH: "ops";
/** @internal */
interface OpsConfigCGroupOverridesOps {
    cpuPath?: string;
    cpuAcctPath?: string;
}
/** @internal */
export interface OpsConfigType {
    interval: Duration;
    cGroupOverrides: OpsConfigCGroupOverridesOps;
}
export declare const opsConfig: ServiceConfigDescriptor<OpsConfigType>;
export {};

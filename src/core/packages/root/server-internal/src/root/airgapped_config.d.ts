import type { TypeOf } from '@kbn/config-schema';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
/**
 * Configuration for running Kibana in an airgapped (network isolated) environment.
 * When enabled, plugins should disable features that require outbound network access.
 */
declare const airgappedConfigSchema: import("@kbn/config-schema").Type<boolean>;
export type AirgappedConfigType = TypeOf<typeof airgappedConfigSchema>;
export declare const airgappedConfig: ServiceConfigDescriptor<AirgappedConfigType>;
export {};

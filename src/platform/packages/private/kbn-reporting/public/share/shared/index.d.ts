import type { Capabilities } from '@kbn/core/public';
export { getSharedComponents } from './get_shared_components';
export type { ApplicationProps, ReportingPublicComponents } from './get_shared_components';
export declare const hasCapabilityByKey: (capabilities: Capabilities, capabilityKey: keyof Capabilities) => boolean;

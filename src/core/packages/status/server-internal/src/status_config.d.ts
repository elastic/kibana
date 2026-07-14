import type { TypeOf } from '@kbn/config-schema';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
declare const statusConfigSchema: import("@kbn/config-schema").ObjectType<{
    allowAnonymous: import("@kbn/config-schema").Type<boolean>;
    statusPageBypassMonitorPrivilege: import("@kbn/config-schema").Type<boolean>;
}>;
export type StatusConfigType = TypeOf<typeof statusConfigSchema>;
export declare const statusConfig: ServiceConfigDescriptor<StatusConfigType>;
export {};

import type { TypeOf } from '@kbn/config-schema';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
declare const configSchema: import("@kbn/config-schema").ObjectType<{
    report_to: import("@kbn/config-schema").Type<string[]>;
}>;
/**
 * @internal
 */
export type PermissionsPolicyConfigType = TypeOf<typeof configSchema>;
export declare const permissionsPolicyConfig: ServiceConfigDescriptor<PermissionsPolicyConfigType>;
export {};

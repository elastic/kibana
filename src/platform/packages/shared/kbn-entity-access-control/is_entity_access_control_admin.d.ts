import type { CheckPrivilegesWithRequest } from '@kbn/security-plugin-types-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
export declare const ENTITY_ACCESS_CONTROL_ADMIN_ACTION = "entity_access_control:admin";
/** Checks administrative application privileges without granting API keys an override. */
export declare const isEntityAccessControlAdmin: (core: {
    security: SecurityServiceStart;
}, request?: KibanaRequest, authz?: {
    checkPrivilegesWithRequest: CheckPrivilegesWithRequest;
}) => Promise<boolean>;

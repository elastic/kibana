import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { AccessControl } from './types';
interface AccessControlState {
    owner_id?: string;
    access_control?: AccessControl<string>;
}
type AccessControlAuditParams = {
    entityType: string;
    entityId: string;
    spaceId?: string;
} & ({
    action: 'denied' | 'admin_override';
    operation: string;
} | {
    action: 'update';
    previous: AccessControlState;
    current: AccessControlState;
});
/** Records ACL changes and authorization decisions without entity contents. */
export declare const logEntityAccessControl: (core: {
    security: SecurityServiceStart;
}, request: KibanaRequest | undefined, params: AccessControlAuditParams) => void;
export {};

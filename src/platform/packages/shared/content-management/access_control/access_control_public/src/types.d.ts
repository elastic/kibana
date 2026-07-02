import type { SavedObjectsChangeAccessControlResponse } from '@kbn/core-saved-objects-api-server';
import type { SavedObjectAccessControl } from '@kbn/core-saved-objects-common';
export interface CheckGlobalPrivilegeResponse {
    isGloballyAuthorized: boolean;
}
export interface IsAccessControlEnabledResponse {
    isAccessControlEnabled: boolean;
}
export interface ChangeAccesModeParameters {
    objects: Array<{
        type: string;
        id: string;
    }>;
    accessMode: SavedObjectAccessControl['accessMode'];
}
export interface ChangeAccessModeResponse {
    result: SavedObjectsChangeAccessControlResponse;
}
export interface CheckUserAccessControlParameters {
    accessControl?: Partial<SavedObjectAccessControl>;
    createdBy?: string;
    userId?: string;
}
export interface CanManageContentControlParameters extends CheckUserAccessControlParameters {
    contentTypeId: string;
}

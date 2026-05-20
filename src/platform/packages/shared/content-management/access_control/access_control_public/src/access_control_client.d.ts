import type { HttpStart } from '@kbn/core-http-browser';
import type { SavedObjectAccessControl } from '@kbn/core-saved-objects-common';
import type { CanManageContentControlParameters, ChangeAccesModeParameters, ChangeAccessModeResponse, CheckGlobalPrivilegeResponse, CheckUserAccessControlParameters } from './types';
export interface AccessControlClientPublic {
    checkGlobalPrivilege(contentTypeId: string): Promise<CheckGlobalPrivilegeResponse>;
    changeAccessMode({ objects, accessMode, }: ChangeAccesModeParameters): Promise<ChangeAccessModeResponse>;
    canManageAccessControl(params: CanManageContentControlParameters): Promise<boolean>;
    checkUserAccessControl(params: CheckUserAccessControlParameters): boolean;
    isInEditAccessMode(accessControl?: Partial<SavedObjectAccessControl>): boolean;
    isAccessControlEnabled(): Promise<boolean>;
}
export declare class AccessControlClient implements AccessControlClientPublic {
    private readonly deps;
    constructor(deps: {
        http: HttpStart;
    });
    checkGlobalPrivilege(contentTypeId: string): Promise<CheckGlobalPrivilegeResponse>;
    changeAccessMode({ objects, accessMode, }: ChangeAccesModeParameters): Promise<ChangeAccessModeResponse>;
    canManageAccessControl({ accessControl, createdBy, userId, contentTypeId, }: CanManageContentControlParameters): Promise<boolean>;
    checkUserAccessControl({ accessControl, createdBy, userId, }: CheckUserAccessControlParameters): boolean;
    isInEditAccessMode(accessControl?: Partial<SavedObjectAccessControl>): boolean;
    isAccessControlEnabled(): Promise<boolean>;
}

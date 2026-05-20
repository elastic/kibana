import React from 'react';
import type { SavedObjectAccessControl } from '@kbn/core-saved-objects-common';
import type { Space } from '@kbn/spaces-plugin/common';
import type { GetUserProfileResponse } from '@kbn/security-plugin/common';
import type { UserProfileData } from '@kbn/user-profile-components';
import type { AccessControlClient } from '../access_control_client';
interface Props {
    onChangeAccessMode: (value: SavedObjectAccessControl['accessMode']) => Promise<string | void> | string | void;
    getActiveSpace?: () => Promise<Space>;
    getCurrentUser: () => Promise<GetUserProfileResponse<UserProfileData>>;
    accessControlClient: AccessControlClient;
    contentTypeId: string;
    accessControl?: Partial<SavedObjectAccessControl>;
    createdBy?: string;
}
export declare const AccessModeContainer: ({ onChangeAccessMode, getActiveSpace, getCurrentUser, accessControlClient, contentTypeId, accessControl, createdBy, }: Props) => React.JSX.Element | null;
export {};

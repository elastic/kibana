import type { Capabilities } from '@kbn/core/public';
import type { SavedObjectAccessControl } from '@kbn/core-saved-objects-common';
import { type AccessControlClient } from '@kbn/content-management-access-control-public';
import type { useShareOptions } from './use_share_options';
export interface ShowShareModalProps {
    shareOptions: ReturnType<typeof useShareOptions>;
    canSave: boolean;
    accessControl?: Partial<SavedObjectAccessControl>;
    createdBy?: string;
    isManaged: boolean;
    accessControlClient: AccessControlClient;
    saveDashboard: () => Promise<void>;
    changeAccessMode: (accessMode: SavedObjectAccessControl['accessMode']) => Promise<void>;
}
export declare const showPublicUrlSwitch: (anonymousUserCapabilities: Capabilities) => boolean;
export declare function ShowShareModal({ shareOptions, canSave, accessControl, createdBy, isManaged, accessControlClient, saveDashboard, changeAccessMode, }: ShowShareModalProps): void;

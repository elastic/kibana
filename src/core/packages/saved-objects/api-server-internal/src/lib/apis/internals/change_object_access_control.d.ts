import { type ISavedObjectTypeRegistry, type ISavedObjectsSecurityExtension, type ISavedObjectsSerializer } from '@kbn/core-saved-objects-server';
import { type SavedObjectsChangeAccessControlResponse, type SavedObjectsChangeAccessControlObject, type SavedObjectsChangeAccessControlOptions, type SavedObjectsChangeAccessModeOptions, type SavedObjectsChangeOwnershipOptions } from '@kbn/core-saved-objects-api-server';
import type { ApiExecutionContext } from '../types';
export type ChangeAccessControlActionType = 'changeOwnership' | 'changeAccessMode';
export interface ChangeAccessControlParams {
    registry: ISavedObjectTypeRegistry;
    allowedTypes: string[];
    client: ApiExecutionContext['client'];
    serializer: ISavedObjectsSerializer;
    getIndexForType: (type: string) => string;
    objects: SavedObjectsChangeAccessControlObject[];
    options: SavedObjectsChangeAccessControlOptions;
    securityExtension?: ISavedObjectsSecurityExtension;
    actionType: ChangeAccessControlActionType;
    currentUserProfileUid: string;
}
export declare const isSavedObjectsChangeAccessModeOptions: (options: SavedObjectsChangeAccessControlOptions) => options is SavedObjectsChangeAccessModeOptions;
export declare const isSavedObjectsChangeOwnershipOptions: (options: SavedObjectsChangeAccessControlOptions) => options is SavedObjectsChangeOwnershipOptions;
export declare const changeObjectAccessControl: (params: ChangeAccessControlParams) => Promise<SavedObjectsChangeAccessControlResponse>;

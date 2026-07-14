import type { SavedObjectError } from '@kbn/core-saved-objects-common';
import type { SavedObjectAccessControl } from '../..';
import type { SavedObjectsBaseOptions } from './base';
export interface SavedObjectsChangeAccessControlObject {
    type: string;
    id: string;
}
export interface SavedObjectsChangeOwnershipOptions extends SavedObjectsBaseOptions {
    newOwnerProfileUid?: SavedObjectAccessControl['owner'];
}
export interface SavedObjectsChangeAccessModeOptions extends SavedObjectsBaseOptions {
    accessMode?: SavedObjectAccessControl['accessMode'];
}
/**
 * Options for the changing ownership of a saved object
 *
 * @public
 */
export type SavedObjectsChangeAccessControlOptions = SavedObjectsChangeOwnershipOptions | SavedObjectsChangeAccessModeOptions;
/**
 * Return type of the Saved Objects `changeOwnership()` method.
 *
 * @public
 */
export interface SavedObjectsChangeAccessControlResponse {
    objects: SavedObjectsChangeAccessControlResponseObject[];
}
export interface SavedObjectsChangeAccessControlResponseObject {
    id: string;
    type: string;
    error?: SavedObjectError;
}

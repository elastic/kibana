import type { SavedObjectError } from '@kbn/core-saved-objects-common';
/**
 * Object parameters for the check conficts operation
 *
 * @public
 */
export interface SavedObjectsCheckConflictsObject {
    /** The ID of the object to check */
    id: string;
    /** The type of the object to check */
    type: string;
}
/**
 * Return type of the Saved Objects `checkConflicts()` method.
 *
 * @public
 */
export interface SavedObjectsCheckConflictsResponse {
    /** Array of errors (contains the conflicting object ID, type, and error details) */
    errors: Array<{
        id: string;
        type: string;
        error: SavedObjectError;
    }>;
}

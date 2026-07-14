import type { SavedObjectsBaseOptions } from './base';
/**
 * Options for the close point-in-time operation
 *
 * @public
 */
export type SavedObjectsClosePointInTimeOptions = SavedObjectsBaseOptions;
/**
 * Return type of the Saved Objects `closePointInTime()` method.
 *
 * @public
 */
export interface SavedObjectsClosePointInTimeResponse {
    /** If true, all search contexts associated with the PIT id are successfully closed */
    succeeded: boolean;
    /** The number of search contexts that have been successfully closed */
    num_freed: number;
}

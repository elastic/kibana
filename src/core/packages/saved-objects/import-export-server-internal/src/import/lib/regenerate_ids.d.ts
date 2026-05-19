import type { SavedObject } from '@kbn/core-saved-objects-common';
import type { ImportStateMap } from './types';
/**
 * Takes an array of saved objects and returns an importStateMap of randomly-generated new IDs.
 *
 * @param objects The saved objects to generate new IDs for.
 */
export declare const regenerateIds: (objects: SavedObject[]) => ImportStateMap;

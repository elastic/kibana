import type { ISavedObjectTypeRegistry, SavedObjectsType } from '@kbn/core-saved-objects-server';
import type { Logger } from '@kbn/logging';
import { type Transform } from './types';
/**
 * Returns all available core transforms for all object types.
 */
export declare function getCoreTransforms({ type, log, }: {
    type: SavedObjectsType;
    log: Logger;
}): Transform[];
/**
 * Returns all applicable conversion transforms for a given object type.
 */
export declare function getConversionTransforms(type: SavedObjectsType): Transform[];
/**
 * Returns all applicable reference transforms for all object types.
 */
export declare function getReferenceTransforms(typeRegistry: ISavedObjectTypeRegistry): Transform[];

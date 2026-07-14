import type { SavedObject } from '@kbn/core-saved-objects-server';
export type SavedObjectComparator = (a: SavedObject, b: SavedObject) => number;
export declare const getObjKey: (obj: SavedObject) => string;
export declare const byIdAscComparator: SavedObjectComparator;
/**
 * Create a comparator that will sort objects depending on their position in the provided array.
 * Objects not present in the array will be appended at the end of the list, and sorted by id asc.
 *
 * @example
 * ```ts
 * const comparator = getPreservedOrderComparator([objA, objB, objC]);
 * const list = [newB, objB, objC, newA, objA]; // with obj.title matching their variable name
 * list.sort()
 * // list = [objA, objB, objC, newA, newB]
 * ```
 */
export declare const getPreservedOrderComparator: (objects: SavedObject[]) => SavedObjectComparator;

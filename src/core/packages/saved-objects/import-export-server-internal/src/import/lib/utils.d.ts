/**
 * @internal
 * Constructs a simple query string for an object that will match any existing objects with the same origin.
 * This matches based on the object's raw document ID (_id) or the object's originId.
 *
 * @param type a saved object type
 * @param id a saved object ID to check; this should be the object's originId if present, otherwise it should be the object's ID
 * @returns a simple query string
 */
export declare function createOriginQuery(type: string, id: string): string;

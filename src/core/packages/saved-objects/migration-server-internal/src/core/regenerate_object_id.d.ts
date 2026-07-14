/**
 * Deterministically regenerates a saved object's ID based upon it's current namespace, type, and ID. This ensures that we can regenerate
 * any existing object IDs without worrying about collisions if two objects that exist in different namespaces share an ID. It also ensures
 * that we can later regenerate any inbound object references to match.
 *
 * @note This is only intended to be used when single-namespace object types are converted into multi-namespace object types.
 * @internal
 */
export declare function deterministicallyRegenerateObjectId(namespace: string, type: string, id: string): string;

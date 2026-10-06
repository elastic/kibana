/**
 * Takes an object with a `type` and `id` field and returns a key string.
 *
 * @internal
 */
export declare function getObjectKey({ type, id }: {
    type: string;
    id: string;
}): string;
/**
 * Parses a 'type:id' key string and returns an object with a `type` field and an `id` field.
 *
 * @internal
 */
export declare function parseObjectKey(key: string): {
    type: string;
    id: string;
};

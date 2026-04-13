/**
 *  Flattens a deeply nested object to a map of dot-separated
 *  paths pointing to all primitive values **and arrays**
 *  from `rootValue`.
 *
 *  example:
 *    getFlattenedObject({ a: { b: 1, c: [2,3] } })
 *    // => { 'a.b': 1, 'a.c': [2,3] }
 *
 *  @public
 */
export declare function getFlattenedObject(rootValue: Record<string, any>): {
    [key: string]: any;
};

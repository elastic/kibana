/**
 * Recursively traverses through the object's properties and expands ones with
 * dot-separated names into nested objects (eg. { a.b: 'c'} -> { a: { b: 'c' }).
 * @param obj Object to traverse through.
 * @param path The current path of the traversal
 * @returns Same object instance with expanded properties.
 */
export declare function ensureDeepObject(obj: any, path?: string[]): any;
export declare const ensureValidObjectPath: (path: string[]) => void;

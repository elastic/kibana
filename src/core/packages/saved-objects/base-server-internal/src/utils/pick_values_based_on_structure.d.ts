export declare function getFlattenedKeys(obj: object): string[];
/**
 * Given two objects, use the first object as a structural map to extract values
 * from a second object, preserving the placement in the first object.
 *
 * @example
 * ```ts
 * const keySource = { a: 1, b: [{ a: 1 }, { a: 2 }] };
 * const target = { a: 2, b: [{ a: 2, b: 3 }, { a: 3, b: 4 }] };
 * pickValuesBasedOnStructure(keySource, target);
 * // => { a: 2, b: [{ a: 2 }, { a: 3 }] }
 * ```
 *
 * @note This is intended to specifically be used in the application of forward
 *       compatibility schemas when loading a saved object from the database,
 *       downgrading it and keeping only the known, validated subset of values.
 */
export declare function pickValuesBasedOnStructure(structuralSource: object, target: object): object;

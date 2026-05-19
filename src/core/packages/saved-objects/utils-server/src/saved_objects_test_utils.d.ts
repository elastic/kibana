/**
 * Determines if a given Set is equal to another given Set. Set types must be the same, and comparable.
 *
 * @param setA The first Set to compare
 * @param setB The second Set to compare
 * @returns {boolean} True if Set A is equal to Set B
 */
export declare function setsAreEqual<T>(setA: Set<T>, setB: Set<T>): boolean;
/**
 * Determines if a given map of arrays is equal to another given map of arrays.
 * Used for comparing namespace maps in saved object repo/security extension tests.
 *
 * @param mapA The first map to compare
 * @param mapB The second map to compare
 * @returns {boolean} True if map A is equal to map B
 */
export declare function arrayMapsAreEqual<T>(mapA: Map<T, T[] | undefined>, mapB: Map<T, T[] | undefined>): boolean;
/**
 * Determines if a given Map of Sets is equal to another given Map of Sets.
 * Used for comparing typeMaps and enforceMaps in saved object repo/security extension tests.
 *
 * @param mapA The first map to compare
 * @param mapB The second map to compare
 * @returns {boolean} True if map A is equal to map B
 */
export declare function setMapsAreEqual<T>(mapA: Map<T, Set<T>> | undefined, mapB: Map<T, Set<T>> | undefined): boolean;

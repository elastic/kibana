import type { Signature } from '../types';
/**
 * Aggregates licenses from an array of signatures into a map.
 * The map's key is the license name, and the value is a Set of associated parameter types.
 */
export declare function aggregateLicensesFromSignatures(signatures: Signature[]): Map<string, Set<string>>;

import type { RawValue } from '@kbn/data-plugin/common';
import type { ColorMapping } from '../config';
/**
 * A class to encapsulate assignment logic
 */
export declare class ColorAssignmentMatcher {
    #private;
    constructor(assignments: ColorMapping.Assignment[]);
    /**
     * Returns count of matching assignments for given value
     */
    getCount(value: RawValue): number;
    /**
     * Returns true if given value has multiple matching assignment
     */
    hasDuplicate(value: RawValue): boolean;
    /**
     * Returns true if given value has matching assignment
     */
    hasMatch(value: RawValue): boolean;
    /**
     * Returns index of first matching assignment for given value
     */
    getIndex(value: RawValue): number;
}
/**
 * A simplified map to track assignment match counts
 *
 * key: stringified value or key of instance methods
 * value: count of matching assignments
 */
export declare function getColorAssignmentMatcher(assignments: ColorMapping.Assignment[]): ColorAssignmentMatcher;

import type { PvalueImpactLevel } from './get_pvalue_impact';
/** Converts a raw ES change-point type string to a human-readable label.
 *  e.g. `"step_change"` → `"Step change"`. */
export declare const humaniseType: (type: string) => string;
/** Returns a plain-English description for a change-point type at the given significance level.
 *  Returns `undefined` for unknown types. */
export declare const getChangePointTypeDescription: (type: string, impactLevel: PvalueImpactLevel) => string | undefined;

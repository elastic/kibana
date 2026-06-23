import type { Signature } from '../../types';
/** Detects signatures where all parameters are expected to stay on the same type family. */
export declare function areParamsHomogeneous(signatures: Signature[]): boolean;
/** Detects whether at least one signature is variadic. */
export declare function hasVariadicSignature(signatures: Signature[]): boolean;
/** Detects repeating signatures such as `CASE(condition, value, condition, value, ...)`. */
export declare function hasRepeatingSignature(signatures: Signature[]): boolean;
/**
 * Detects signatures that are meant to accept full expressions, not only simple values.
 *
 * Example: `CASE` mixes boolean conditions with result expressions.
 */
export declare function hasArbitraryExpressionSignature(signatures: Signature[]): boolean;
/** Detects whether a function family can start with a boolean parameter. */
export declare function hasBooleanSignature(signatures: Signature[]): boolean;

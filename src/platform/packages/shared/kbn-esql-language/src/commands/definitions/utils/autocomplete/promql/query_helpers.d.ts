import type { PromQLAstNode, PromQLAstQueryExpression, PromQLBinaryExpression, PromQLFunction, PromQLSelector } from '@elastic/esql';
import type { PromQLFunctionParamType } from '../../../types';
import type { CursorMatch, PromqlDetailedPosition } from './types';
/** Walks the AST to find the closest completed aggregation before the cursor. */
export declare function findNearestAggregation(root: PromQLAstQueryExpression, logicalCursor: number): PromQLFunction | undefined;
/** Gets the binary-expression node nearest to cursor, if present in match chain. */
export declare function getBinaryNodeAtCursor(match: CursorMatch | undefined, outermostIncompleteBinary: PromQLBinaryExpression | undefined): PromQLBinaryExpression | undefined;
/** Finds selector in binary RHS where cursor is after it (searches function args only). */
export declare function findSelectorAfterBinaryInArgs(func: PromQLFunction, cursor: number): PromQLSelector | undefined;
/** Uses function definitions to bound how many arguments can be suggested. */
export declare function getMaxParamsForFunction(name: string): number | undefined;
/**
 * Computes param index by walking function args and comparing cursor position.
 * Smart clamping: when cursor is past the last arg but no comma follows it,
 * stays on the current param (e.g., `rate(metric{job="a,b"} |)` -> param 0).
 */
export declare function computeParamIndexFromArgs(func: PromQLFunction, relativeCursor: number, text: string): number;
/** Checks if cursor is at an argument boundary in a function. */
export declare function isAtFunctionArgStart(text: string, cursor: number, func: PromQLFunction): boolean;
/** Resolves signature types by walking up to the enclosing function. */
export declare function getSignatureTypesFromAncestors(text: string, cursor: number, innermostFunc?: PromQLFunction, funcAtCursor?: PromQLAstNode): PromQLFunctionParamType[];
/** Returns true when cursor is after an aggregation function name before `(`, e.g. `sum |`. */
export declare function isAfterAggregationName(textBeforeCursor: string): boolean;
/** Text fallback for label maps where the AST is unreliable. */
export declare function getLabelMapTextFallbackPosition(text: string, cursor: number): PromqlDetailedPosition | undefined;
/** Returns true when cursor is inside a grouping clause with a trailing identifier. */
export declare function hasGroupingTrailingIdentifier(text: string, cursor: number, groupingStart: number): boolean;

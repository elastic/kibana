import type { ESQLAstItem, ESQLFunction } from '@elastic/esql/types';
import type { ExpressionContext, FunctionParameterContext } from './types';
import type { ICommandContext, ISuggestionItem } from '../../../../registry/types';
import type { SupportedDataType } from '../../../types';
import type { PreferredExpressionType } from './types';
export type SpecialFunctionName = 'case' | 'count' | 'bucket';
export type IncompleteOperatorReason = 'tooFewArgs' | 'wrongTypes';
/** IN, NOT IN, IS NULL, IS NOT NULL operators requiring special autocomplete handling */
export declare const specialOperators: import("../../../types").FunctionDefinition[];
/** Checks if operator is a NULL check (IS NULL, IS NOT NULL) */
export declare function isNullCheckOperator(name: string): boolean;
/** Checks if operator is IN or NOT IN */
export declare function isInOperator(name: string): boolean;
/** Checks if operator requires special handling */
export declare function isSpecialOperator(name: string): boolean;
/** Checks if function name matches a special function (case-insensitive) */
export declare function matchesSpecialFunction(name: string, expected: SpecialFunctionName): boolean;
/**
 *   Builds function parameter context for suggestions
 *   Commands with special filtering (like STATS) can extend with command-specific functionsToIgnore
 */
export declare function buildExpressionFunctionParameterContext(fn: ESQLFunction, context?: ICommandContext, shouldGetNextArgument?: boolean): FunctionParameterContext | null;
/**
 * Explains why an operator invocation is not yet complete for autocomplete purposes.
 */
export declare function getIncompleteOperatorReason(operator: ESQLFunction, getExpressionType: (expression: ESQLAstItem) => SupportedDataType | 'unknown'): IncompleteOperatorReason | undefined;
/**
 * Tries to get KQL suggestions if the cursor is inside a KQL function string parameter.
 *
 * Detects patterns like:
 * - KQL("""query here...""")
 *
 * Returns null if not inside a KQL function string, allowing normal suggestion flow.
 */
export declare function getKqlSuggestionsIfApplicable(ctx: ExpressionContext): Promise<ISuggestionItem[] | null>;
/** Normalizes preferred expression type option into an array form for downstream checks. */
export declare function normalizePreferredExpressionTypes(preferredExpressionType?: PreferredExpressionType | PreferredExpressionType[]): PreferredExpressionType[];

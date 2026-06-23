import { type PromQLAstExpression } from '@elastic/esql';
import type { ESQLAstItem, ESQLFunction, ESQLSingleAstItem } from '@elastic/esql/types';
import type { PromQLFunctionParamType, SupportedDataType } from '../types';
import type { ESQLColumnData } from '../../registry/types';
import { UnmappedFieldsStrategy } from '../../registry/types';
/**
 * Determines the type of the expression
 * @param root The root AST node of the expression
 * @param columns Optional map of available columns to resolve column types
 * @param unmappedFieldsStrategy Strategy to handle unmapped fields, it's only relevant if columns maps is provided
 * @returns The determined type or 'unknown' if it cannot be determined
 */
export declare function getExpressionType(root: ESQLAstItem | undefined, columns?: Map<string, ESQLColumnData>, unmappedFieldsStrategy?: UnmappedFieldsStrategy): SupportedDataType | 'unknown';
export declare function resolveArgumentTypes(args: ESQLAstItem[], options?: {
    columns?: Map<string, ESQLColumnData>;
    unmappedFieldsStrategy?: UnmappedFieldsStrategy;
}): {
    argTypes: (SupportedDataType | 'unknown')[];
    literalMask: boolean[];
};
/**
 * Builds a regex that matches partial strings starting
 * from the beginning of the string.
 *
 * Example:
 * "is null" -> /^i(?:s(?:\s+(?:n(?:u(?:l(?:l)?)?)?)?)?)?$/i
 */
export declare function buildPartialMatcher(str: string): string;
/**
 * Checks whether an expression is truly complete.
 *
 * (Encapsulates handling of the "is null" and "is not null"
 * checks)
 *
 * @todo use the simpler "getExpressionType(root) !== 'unknown'"
 * as soon as https://github.com/elastic/kibana/issues/199401 is resolved
 */
export declare function isExpressionComplete(expressionType: SupportedDataType | 'unknown', innerText: string): boolean;
/**
 * Returns the left or right operand of a binary expression function.
 */
export declare function getBinaryExpressionOperand(binaryExpression: ESQLFunction, side: 'left' | 'right'): ESQLSingleAstItem | ESQLSingleAstItem[] | undefined;
/**
 * Extracts a valid expression root from an assignment, handling array operands.
 */
export declare function getAssignmentExpressionRoot(assignment: ESQLFunction): ESQLSingleAstItem | undefined;
export declare function getPromqlExpressionType(expression: PromQLAstExpression): PromQLFunctionParamType | undefined;

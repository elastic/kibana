import type { BinaryExpressionComparisonOperator, ESQLFunction } from '@elastic/esql/types';
export type SupportedOperation = '+' | '-' | 'is_not_null' | 'is_null';
export type SupportedOperators = Extract<BinaryExpressionComparisonOperator, '==' | '!='> | 'is not null' | 'is null';
export declare const PARAM_TYPES_NO_NEED_IMPLICIT_STRING_CASTING: string[];
/**
 * Gets the operator and expression type for the given operation
 */
export declare const getOperator: (operation: "+" | "-" | "is_not_null" | "is_null") => {
    operator: SupportedOperators;
    expressionType: "postfix-unary" | "binary";
};
/**
 * Get the list of supported operators dynamically by mapping all possible operation inputs
 */
export declare function getSupportedOperators(): SupportedOperators[];
/**
 * Escapes a string value for use in ES|QL queries by escaping special characters
 */
export declare function escapeStringValue(val: string): string;
/**
 * Append in a new line the appended text to take care of the case where the user adds a comment at the end of the query.
 * In these cases a base query such as "from index // comment" will result in errors or wrong data if we don't append in a new line
 */
export declare function appendToESQLQuery(baseESQLQuery: string, appendedText: string): string;
/**
 * Extracts field name and value from a MATCH function AST node
 */
export declare function extractMatchFunctionDetails(matchFunction: ESQLFunction): {
    columnName: string;
    literalValue: string;
} | null;
/**
 * Extracts field name and values from an MV_CONTAINS function AST node,
 * supporting both casted and uncast scalar or list values
 */
export declare function extractMvContainsFunctionDetails(mvContainsFunction: ESQLFunction): {
    columnName: string;
    literalValues: Array<string | number>;
} | null;

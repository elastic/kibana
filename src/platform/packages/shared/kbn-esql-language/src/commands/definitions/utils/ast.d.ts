import type { ESQLFunction, ESQLSingleAstItem, ESQLAstItem, ESQLCommandOption, ESQLAstHeaderCommand, ESQLAstQueryExpression } from '@elastic/esql/types';
export declare function isMarkerNode(node: ESQLAstItem | undefined): boolean;
export declare function isNotMarkerNodeOrArray(arg: ESQLAstItem): boolean;
export declare function mapToNonMarkerNode(arg: ESQLAstItem): ESQLAstItem;
export declare function findAstPosition(ast: ESQLAstQueryExpression, offset: number): {
    command: undefined;
    node: undefined;
    containingFunction?: undefined;
    option?: undefined;
} | {
    command: import("@elastic/esql/types").ESQLCommand<string> | ESQLAstHeaderCommand<string, ESQLSingleAstItem>;
    containingFunction: ESQLFunction<import("@elastic/esql/types").FunctionSubtype, string> | undefined;
    option: ESQLCommandOption | undefined;
    node: import("@elastic/esql/types").ESQLSource | ESQLAstQueryExpression | ESQLFunction<import("@elastic/esql/types").FunctionSubtype, string> | ESQLCommandOption | import("@elastic/esql/types").ESQLParens | import("@elastic/esql/types").ESQLColumn | import("@elastic/esql/types").ESQLDatePeriodLiteral | import("@elastic/esql/types").ESQLTimeDurationLiteral | import("@elastic/esql/types").ESQLList | import("@elastic/esql/types").ESQLDecimalLiteral | import("@elastic/esql/types").ESQLIntegerLiteral | import("@elastic/esql/types").ESQLBooleanLiteral | import("@elastic/esql/types").ESQLNullLiteral | import("@elastic/esql/types").ESQLStringLiteral | import("@elastic/esql/types").ESQLParamLiteral<string, import("@elastic/esql/types").ESQLParamKinds> | import("@elastic/esql/types").ESQLIdentifier | import("@elastic/esql/types").ESQLInlineCast<ESQLAstItem> | import("@elastic/esql/types").ESQLOrderExpression | import("@elastic/esql/types").ESQLUnknownItem | import("@elastic/esql/types").ESQLMap | import("@elastic/esql/types").ESQLMapEntry | import("@elastic/esql").PromQLAstQueryExpression | undefined;
};
/**
 * This function returns a list of closing brackets that can be appended to
 * a partial query to make it valid.
 *
 * A known limitation of this is that is not aware of commas "," or pipes "|"
 * so it is not yet helpful on a multiple commands errors (a workaround is to pass each command here...)
 *
 * It does not autocomplete missing brackets within quotes or triple quotes.
 * @param text
 * @returns
 */
export declare function getBracketsToClose(text: string): string[];
/**
 * This function attempts to correct the syntax of a partial query to make it valid.
 *
 * We are generally dealing with incomplete queries when the user is typing. But,
 * having an AST is helpful so we heuristically correct the syntax so it can be parsed.
 *
 * @param _query
 * @param context
 * @returns
 */
export declare function correctQuerySyntax(_query: string): string;
/**
 * Corrects partial PromQL syntax so the PromQL parser can build a stable AST while typing.
 * It keeps the same marker semantics used in ES|QL correction, but only for trailing
 * separators relevant to PromQL argument/subquery contexts.
 */
export declare function correctPromqlQuerySyntax(input: string): string;

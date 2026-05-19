import type { ESQLAstQueryExpression } from '@elastic/esql/types';
interface ParsedAutocompleteQuery {
    innerText: string;
    correctedQuery: string;
    root: ESQLAstQueryExpression;
}
/**
 * Parses the query up to the cursor for autocomplete.
 * It fixes incomplete input before parsing and returns AST data built from the corrected text.
 */
export declare function parseAutocompleteQuery(fullText: string, offset: number): ParsedAutocompleteQuery;
/** Parses the query and resolves the cursor context (command, option, node). */
export declare function getAutocompleteCursorContext(fullText: string, offset: number): {
    astContext: {
        type: "comment";
        isCursorInSubquery: boolean;
        queryContainsSubqueries: boolean;
        astForContext: ESQLAstQueryExpression;
        command?: undefined;
        node?: undefined;
        option?: undefined;
        containingFunction?: undefined;
    } | {
        type: "newCommand";
        command: undefined;
        node: import("@elastic/esql/types").ESQLSource | ESQLAstQueryExpression | import("@elastic/esql/types").ESQLFunction<import("@elastic/esql/types").FunctionSubtype, string> | import("@elastic/esql/types").ESQLCommandOption | import("@elastic/esql/types").ESQLParens | import("@elastic/esql/types").ESQLColumn | import("@elastic/esql/types").ESQLDatePeriodLiteral | import("@elastic/esql/types").ESQLTimeDurationLiteral | import("@elastic/esql/types").ESQLList | import("@elastic/esql/types").ESQLDecimalLiteral | import("@elastic/esql/types").ESQLIntegerLiteral | import("@elastic/esql/types").ESQLBooleanLiteral | import("@elastic/esql/types").ESQLNullLiteral | import("@elastic/esql/types").ESQLStringLiteral | import("@elastic/esql/types").ESQLParamLiteral<string, import("@elastic/esql/types").ESQLParamKinds> | import("@elastic/esql/types").ESQLIdentifier | import("@elastic/esql/types").ESQLInlineCast<import("@elastic/esql/types").ESQLAstItem> | import("@elastic/esql/types").ESQLOrderExpression | import("@elastic/esql/types").ESQLUnknownItem | import("@elastic/esql/types").ESQLMap | import("@elastic/esql/types").ESQLMapEntry | import("@elastic/esql").PromQLAstQueryExpression | undefined;
        option: import("@elastic/esql/types").ESQLCommandOption | undefined;
        containingFunction: import("@elastic/esql/types").ESQLFunction<import("@elastic/esql/types").FunctionSubtype, string> | undefined;
        isCursorInSubquery: boolean;
        queryContainsSubqueries: boolean;
        astForContext: ESQLAstQueryExpression;
    } | {
        type: "expression";
        command: import("@elastic/esql/types").ESQLCommand<string> | import("@elastic/esql/types").ESQLAstHeaderCommand<string, import("@elastic/esql/types").ESQLSingleAstItem>;
        containingFunction: import("@elastic/esql/types").ESQLFunction<import("@elastic/esql/types").FunctionSubtype, string> | undefined;
        option: import("@elastic/esql/types").ESQLCommandOption | undefined;
        node: import("@elastic/esql/types").ESQLSource | ESQLAstQueryExpression | import("@elastic/esql/types").ESQLFunction<import("@elastic/esql/types").FunctionSubtype, string> | import("@elastic/esql/types").ESQLCommandOption | import("@elastic/esql/types").ESQLParens | import("@elastic/esql/types").ESQLColumn | import("@elastic/esql/types").ESQLDatePeriodLiteral | import("@elastic/esql/types").ESQLTimeDurationLiteral | import("@elastic/esql/types").ESQLList | import("@elastic/esql/types").ESQLDecimalLiteral | import("@elastic/esql/types").ESQLIntegerLiteral | import("@elastic/esql/types").ESQLBooleanLiteral | import("@elastic/esql/types").ESQLNullLiteral | import("@elastic/esql/types").ESQLStringLiteral | import("@elastic/esql/types").ESQLParamLiteral<string, import("@elastic/esql/types").ESQLParamKinds> | import("@elastic/esql/types").ESQLIdentifier | import("@elastic/esql/types").ESQLInlineCast<import("@elastic/esql/types").ESQLAstItem> | import("@elastic/esql/types").ESQLOrderExpression | import("@elastic/esql/types").ESQLUnknownItem | import("@elastic/esql/types").ESQLMap | import("@elastic/esql/types").ESQLMapEntry | import("@elastic/esql").PromQLAstQueryExpression | undefined;
        isCursorInSubquery: boolean;
        queryContainsSubqueries: boolean;
        astForContext: ESQLAstQueryExpression;
    };
    innerText: string;
    correctedQuery: string;
    root: ESQLAstQueryExpression;
};
/** Parses the query and locates the AST node at the cursor position. */
export declare function findAutocompleteAstPosition(fullText: string, offset: number): {
    command: undefined;
    node: undefined;
    containingFunction?: undefined;
    option?: undefined;
    innerText: string;
    correctedQuery: string;
    root: ESQLAstQueryExpression;
} | {
    command: import("@elastic/esql/types").ESQLCommand<string> | import("@elastic/esql/types").ESQLAstHeaderCommand<string, import("@elastic/esql/types").ESQLSingleAstItem>;
    containingFunction: import("@elastic/esql/types").ESQLFunction<import("@elastic/esql/types").FunctionSubtype, string> | undefined;
    option: import("@elastic/esql/types").ESQLCommandOption | undefined;
    node: import("@elastic/esql/types").ESQLSource | ESQLAstQueryExpression | import("@elastic/esql/types").ESQLFunction<import("@elastic/esql/types").FunctionSubtype, string> | import("@elastic/esql/types").ESQLCommandOption | import("@elastic/esql/types").ESQLParens | import("@elastic/esql/types").ESQLColumn | import("@elastic/esql/types").ESQLDatePeriodLiteral | import("@elastic/esql/types").ESQLTimeDurationLiteral | import("@elastic/esql/types").ESQLList | import("@elastic/esql/types").ESQLDecimalLiteral | import("@elastic/esql/types").ESQLIntegerLiteral | import("@elastic/esql/types").ESQLBooleanLiteral | import("@elastic/esql/types").ESQLNullLiteral | import("@elastic/esql/types").ESQLStringLiteral | import("@elastic/esql/types").ESQLParamLiteral<string, import("@elastic/esql/types").ESQLParamKinds> | import("@elastic/esql/types").ESQLIdentifier | import("@elastic/esql/types").ESQLInlineCast<import("@elastic/esql/types").ESQLAstItem> | import("@elastic/esql/types").ESQLOrderExpression | import("@elastic/esql/types").ESQLUnknownItem | import("@elastic/esql/types").ESQLMap | import("@elastic/esql/types").ESQLMapEntry | import("@elastic/esql").PromQLAstQueryExpression | undefined;
    innerText: string;
    correctedQuery: string;
    root: ESQLAstQueryExpression;
};
export {};

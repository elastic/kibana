import type { ESQLAstQueryExpression } from '@elastic/esql/types';
/**
 * Given a ES|QL query string, its AST and the cursor position,
 * it returns the type of context for the position ("list", "function", "option", "setting", "expression", "newCommand")
 * plus the whole hierarchy of nodes (command, option, setting and actual position node) context.
 *
 * Type details:
 * * "list": the cursor is inside a "in" list of values (i.e. `a in (1, 2, <here>)`)
 * * "function": the cursor is inside a function call (i.e. `fn(<here>)`)
 * * "expression": the cursor is inside a command expression (i.e. `command ... <here>` or `command a = ... <here>`)
 * * "newCommand": the cursor is at the beginning of a new command (i.e. `command1 | command2 | <here>`)
 */
export declare function getCursorContext(queryString: string, queryAst: ESQLAstQueryExpression, offset: number): {
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

import type { PromQLAstQueryExpression } from '@elastic/esql';
import type { ESQLAstQueryExpression } from '@elastic/esql/types';
import { type EsqlLexerToken } from './lexer_scope';
interface ParsedAutocompleteQuery {
    innerText: string;
    root: ESQLAstQueryExpression;
    tokens: EsqlLexerToken[];
}
/**
 * Parses the query up to the cursor for autocomplete.
 * It fixes incomplete input before parsing and returns AST data built from the corrected text.
 */
export declare function parseAutocompleteQuery(fullText: string, offset: number): ParsedAutocompleteQuery;
/**
 * PromQL counterpart of {@link parseAutocompleteQuery}: corrects partial PromQL syntax,
 * parses it, and strips autocomplete markers from the resulting AST.
 */
export declare function parsePromqlAutocompleteQuery(query: string): {
    correctedQuery: string;
    root: PromQLAstQueryExpression;
};
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
        node: import("@elastic/esql/types").ESQLSingleAstItem | undefined;
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
        node: import("@elastic/esql/types").ESQLSingleAstItem | undefined;
        isCursorInSubquery: boolean;
        queryContainsSubqueries: boolean;
        astForContext: ESQLAstQueryExpression;
    };
    innerText: string;
    root: ESQLAstQueryExpression;
    tokens: EsqlLexerToken[];
};
/** Parses the query and locates the AST node at the cursor position. */
export declare function findAutocompleteAstPosition(fullText: string, offset: number): {
    command: undefined;
    node: undefined;
    containingFunction?: undefined;
    option?: undefined;
    innerText: string;
    root: ESQLAstQueryExpression;
    tokens: EsqlLexerToken[];
} | {
    command: import("@elastic/esql/types").ESQLCommand<string> | import("@elastic/esql/types").ESQLAstHeaderCommand<string, import("@elastic/esql/types").ESQLSingleAstItem>;
    containingFunction: import("@elastic/esql/types").ESQLFunction<import("@elastic/esql/types").FunctionSubtype, string> | undefined;
    option: import("@elastic/esql/types").ESQLCommandOption | undefined;
    node: import("@elastic/esql/types").ESQLSingleAstItem | undefined;
    innerText: string;
    root: ESQLAstQueryExpression;
    tokens: EsqlLexerToken[];
};
export {};

import type { ESQLAstHighlightCommand, ESQLColumn, ESQLIdentifier } from '@elastic/esql/types';
/**
 * The keyword accepted by the optional `prefix = "..."` modifier. Elasticsearch rejects
 * any other identifier there.
 */
export declare const HIGHLIGHT_PREFIX_KEYWORD = "prefix";
/**
 * Prefix applied to the generated columns when `prefix = "..."` is not specified.
 * Mirrors `Highlight.DEFAULT_PREFIX` in Elasticsearch.
 */
export declare const HIGHLIGHT_DEFAULT_PREFIX = "highlight_";
/** The keyword introducing the mandatory field list. */
export declare const HIGHLIGHT_ON_KEYWORD = "on";
export declare enum CaretPosition {
    PREFIX_VALUE = 0,// After `prefix =`: suggest the prefix string
    QUERY_EXPRESSION = 1,// Before ON: build the query expression (and optionally start a prefix)
    ON_KEYWORD = 2,// After a complete query expression: suggest ON keyword
    ON_EXPRESSION = 3,// After ON: suggest field list (comma + more fields handled by suggestFieldsList)
    AFTER_WITH_KEYWORD = 4,// After WITH but before opening brace: suggest map opener
    WITHIN_MAP_EXPRESSION = 5,// Within WITH { ... }: suggest map parameters
    AFTER_COMMAND = 6
}
export declare function getPosition(query: string, command: ESQLAstHighlightCommand, cursorPosition: number): CaretPosition;
/**
 * The identifier on the left of the `prefix = "..."` assignment, when the command has one.
 * The parser accepts any identifier there, so callers must check it against
 * {@link HIGHLIGHT_PREFIX_KEYWORD} — Elasticsearch rejects anything else.
 */
export declare const getPrefixKeyword: (command: ESQLAstHighlightCommand) => ESQLColumn | ESQLIdentifier | undefined;
/**
 * Whether the `prefix = "..."` modifier can still be typed at the cursor: it must come first
 * and only once.
 */
export declare const canSuggestPrefix: (query: string, command: ESQLAstHighlightCommand, cursorPosition: number) => boolean;
/** The prefix applied to the generated columns, falling back to the Elasticsearch default. */
export declare const getHighlightPrefix: (command: ESQLAstHighlightCommand) => string;
/**
 * Names of the columns HIGHLIGHT generates: one per ON field, prefixed. An empty prefix makes
 * the highlighted value overwrite the source column.
 */
export declare const getHighlightColumnNames: (command: ESQLAstHighlightCommand) => string[];

import type { monaco } from '@kbn/code-editor';
import type { CommandRange, SourceCommandContext, LocatedSourceItem } from './types';
import { IndicesBrowserOpenMode } from './types';
export declare const getRangeFromOffsets: (model: monaco.editor.ITextModel, startOffset: number, endOffset: number) => monaco.IRange;
/**
 * Returns the first command in the query that matches one of the `supportedCommands`.
 *
 * We use the ESQL AST to find the command and its `location.min` (a 0-based character offset
 * into the full query string). That offset is then converted to a Monaco-style range
 * (1-based line/column) so we can decorate the exact command keyword without relying on
 * brittle string searches.
 *
 * For incomplete/invalid queries, parsing may fail; in that case this returns `undefined`.
 */
export declare const getSupportedCommand: (query: string) => {
    command: string;
    range?: CommandRange;
} | undefined;
/**
 * Computes the source-command context for opening the indices browser.
 *
 * This is a small, pure helper so we can unit test the "where do we insert" and "what range do we
 * treat as the sources list" logic without having to pass Monaco models/editors or React refs.
 */
export declare const getSourceCommandContextFromQuery: ({ queryText, cursorOffset, openedFrom, }: {
    queryText: string;
    cursorOffset?: number;
    openedFrom: IndicesBrowserOpenMode;
}) => SourceCommandContext;
/**
 * Returns the query text up to (but not including) the last pipe, so that a trailing
 * command (e.g. `| KEEP`) is dropped and we can run the query to get columns from the
 * previous pipeline. Uses the ESQL parser to find the last command boundary.
 *
 * Examples:
 * - "FROM a | STATS AVG(bytes) | KEEP" → "FROM a | STATS AVG(bytes)"
 * - "FROM kibana_sample_data_logs | KEEP" → "FROM kibana_sample_data_logs"
 * - "FROM a | STATS count(*)" → "FROM a"
 * - "FROM a" → "FROM a"
 */
export declare const getQueryWithoutLastPipe: (queryText: string) => string;
/**
 * Parses the query and returns the `location.min/max` for each *existing* `source` argument
 * of the main `FROM`/`TS` command.
 *
 * This is used to remove an exact source token (and its adjacent comma) without rewriting
 * the rest of the sources list.
 */
export declare const getLocatedSourceItemsFromQuery: (query: string) => LocatedSourceItem[];
/**
 * Walks left from an offset to find the first non-whitespace character.
 * Used to decide whether we need to add a leading comma when inserting at the cursor.
 */
export declare const findPrevNonWhitespaceChar: (text: string, from: number, lowerBound: number) => string | undefined;
/**
 * Walks right from an offset to find the first non-whitespace character.
 * Used to decide whether we need to add a trailing comma when inserting at the cursor.
 */
export declare const findNextNonWhitespaceChar: (text: string, from: number, upperBound: number) => string | undefined;
/**
 * Computes the exact `[start, end)` range to delete when removing a source.
 *
 * Rules:
 * - If source is at the front or in the middle: delete `source + following comma` when present
 * - If source is at the end: delete `preceding comma + source` when present
 *
 * Whitespace around commas is intentionally preserved to avoid reformatting the user's query.
 */
export declare const computeRemovalRange: (query: string, items: LocatedSourceItem[], sourceName: string) => {
    start: number;
    end: number;
} | undefined;
/**
 * Computes the insertion text (and offset) for adding a source.
 *
 * Rules:
 * - `badge`: insert at the beginning of the sources list; add a trailing comma when there are existing sources
 * - `autocomplete`: insert at cursor; add a leading/trailing comma when needed based on nearby tokens
 *
 * This returns the exact `text` to insert without changing surrounding whitespace.
 */
export declare const computeInsertionText: ({ query, items, at, sourceName, mode, }: {
    query: string;
    items: Array<{
        min: number;
        max: number;
    }>;
    at: number;
    sourceName: string;
    mode: "badge" | "autocomplete";
}) => {
    at: number;
    text: string;
};

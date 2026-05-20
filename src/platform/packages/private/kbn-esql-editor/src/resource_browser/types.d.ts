/**
 * Where the indices browser was opened from.
 *
 * This affects insertion behavior:
 * - `Badge`: insert at the beginning of the sources list
 * - `Autocomplete`: insert at the cursor position
 */
export declare enum IndicesBrowserOpenMode {
    Badge = "badge",
    Autocomplete = "autocomplete"
}
/**
 * The position of the browser popover.
 */
export interface BrowserPopoverPosition {
    top?: number;
    left?: number;
}
/**
 * A Monaco editor range of a command in the ES|QL query.
 */
export interface CommandRange {
    lineNumber: number;
    startColumn: number;
    endColumn: number;
}
/**
 * This is used to represent a source item in the query.
 *
 * min: the start offset of the source item
 * max: the end offset of the source item
 * type: the type of the source item
 * name: the name of the source item
 */
export interface LocatedSourceItem {
    min: number;
    max: number;
    type?: string;
    name?: string;
}
export interface SourceCommandContext {
    /** The main source command in the query, if present. */
    command?: 'from' | 'ts';
    /**
     * `[start, end)` offsets of the *existing* source arguments for the main `FROM`/`TS` command.
     * When there are no existing sources (e.g. `FROM |`), these are `undefined`.
     */
    sourcesStartOffset?: number;
    sourcesEndOffset?: number;
    /**
     * Where a newly selected source should be inserted, as a 0-based offset into the query string.
     *
     * - If opened from the badge and there are existing sources, we insert at the beginning of the
     *   sources list.
     * - Otherwise, we insert at the cursor (when available).
     */
    insertionOffset?: number;
}

export declare const DEFAULT_HIGHLIGHT_PRE_TAG = "<em>";
export declare const DEFAULT_HIGHLIGHT_POST_TAG = "</em>";
export interface ESQLHighlightTags {
    preTag: string;
    postTag: string;
}
export type ESQLColumnsWithHighlights = Record<string, ESQLHighlightTags>;
/**
 * Returns columns built using a highlighting algorithm,
 * including the opening and closing markup tags configured for each column.
 *
 * Example:
 * ```
 * FROM books
 *  | EVAL snippets = TOP_SNIPPETS(description, "Tolkien", { "highlight": true })
 *  | EVAL titles = TOP_SNIPPETS(title, "Tolkien", { "highlight": true, "pre_tag": "<mark>", "post_tag": "</mark>" })
 * ```
 * Will return the following map:
 * ```
 * {
 *   snippets: {
 *     preTag: '<em>',
 *     postTag: '</em>',
 *   },
 *   titles: {
 *     preTag: '<mark>',
 *     postTag: '</mark>',
 *   },
 * }
 */
export declare function getColumnsWithHighlights(query: string): ESQLColumnsWithHighlights;

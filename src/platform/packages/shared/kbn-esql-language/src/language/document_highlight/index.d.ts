interface DocumentHighlightItem {
    start: number;
    end: number;
}
/**
 * Returns all occurrences of the field (column) at the given offset in the query.
 * If the cursor is not on a column node, returns an empty array.
 */
export declare function getDocumentHighlightItems(fullText: string, offset: number): DocumentHighlightItem[];
export {};

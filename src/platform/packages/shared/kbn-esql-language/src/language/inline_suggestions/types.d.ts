export interface InlineSuggestionItem {
    /**
     * The text to insert.
     * If the text contains a line break, the range must end at the end of a line.
     * If existing text should be replaced, the existing text must be a prefix of the text to insert.
     */
    insertText: string;
    /**
     * A text that is used to decide if this inline completion should be shown.
     * An inline completion is shown if the text to replace is a subword of the filter text.
     */
    filterText?: string;
    /**
     * The range to replace.
     * Must begin and end on the same line.
     */
    range?: {
        /**
         * Line number on which the range starts (starts at 1).
         */
        readonly startLineNumber: number;
        /**
         * Column on which the range starts in line `startLineNumber` (starts at 1).
         */
        readonly startColumn: number;
        /**
         * Line number on which the range ends.
         */
        readonly endLineNumber: number;
        /**
         * Column on which the range ends in line `endLineNumber`.
         */
        readonly endColumn: number;
    };
    /**
     * Suggestions can trigger a command by id. This is useful to trigger specific actions in some contexts
     */
    command?: {
        title: string;
        id: string;
    };
    /**
     * If set to `true`, unopened closing brackets are removed and unclosed opening brackets are closed.
     * Defaults to `false`.
     */
    completeBracketPairs?: boolean;
}

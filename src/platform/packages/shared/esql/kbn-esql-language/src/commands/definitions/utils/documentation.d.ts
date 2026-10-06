/**
 * Wraps lines that exceed MAX_LINE_LENGTH at word boundaries,
 * indenting continuation lines with two spaces.
 * Tokens without spaces that are still too long are further
 * split at delimiter characters like `|` and `,`.
 */
/** @internal exported for testing */
export declare function wrapLines(text: string): string;
/** @internal */
export declare const buildFunctionDocumentation: (detail: string, signatures: Array<{
    declaration: string;
    license?: string;
}>, examples: string[] | undefined) => string;
/** @internal **/
export declare const buildDocumentation: (detail: string, declaration: string, examples?: string[]) => string;

import { Walker } from '@elastic/esql';
import type { ESQLAstBaseItem, ESQLFunction } from '@elastic/esql/types';
/**
 * Extracts the parameter list from a formatted function signature.
 */
export declare function getParameterList(formattedSignature: string): string[];
/**
 * Determines which parameter should be highlighted in signature help based on cursor position.
 *
 * @param innerText - The query text up to the cursor position
 * @param fnNode - The function AST node
 * @param offset - The cursor offset in the full query
 * @returns The index of the parameter to highlight (0-based)
 *
 * Examples:
 * - `COUNT_DISTINCT(|` -> 0 (cursor after opening paren)
 * - `COUNT_DISTINCT(field|` -> 0 (cursor within first arg)
 * - `COUNT_DISTINCT(field,|` -> 1 (cursor after comma)
 * - `COUNT_DISTINCT(field, |` -> 1 (cursor after comma with space)
 * - `COUNT_DISTINCT(field, 10|` -> 1 (cursor within second arg)
 */
export declare function getArgumentToHighlightIndex(innerText: string, fnNode: ESQLFunction | {
    args: Array<Pick<ESQLAstBaseItem, 'location'>>;
}, offset: number): number;
export declare function getPromqlSignatureHelp(root: Parameters<typeof Walker.walk>[0], fullText: string, offset: number): {
    signatures: {
        label: string;
        documentation: string | undefined;
        parameters: {
            label: string;
            documentation: string;
        }[];
    }[];
    activeSignature: number;
    activeParameter: number;
} | undefined;
export declare function buildSignatureHelpItem(formattedSignature: string, fnDefinition: {
    description?: string;
    signatures?: Array<{
        params: Array<{
            name: string;
            description?: string;
        }>;
    }>;
}, parameters: string[], currentArgIndex: number): {
    signatures: {
        label: string;
        documentation: string | undefined;
        parameters: {
            label: string;
            documentation: string;
        }[];
    }[];
    activeSignature: number;
    activeParameter: number;
};

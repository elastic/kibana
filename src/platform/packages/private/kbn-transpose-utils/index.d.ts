/**
 * Used to delimitate felids of a transposed column id
 */
export declare const TRANSPOSE_SEPARATOR = "---";
/**
 * Visual deliminator between felids of a transposed column id
 *
 * Meant to align with the `MULTI_FIELD_KEY_SEPARATOR` from the data plugin
 */
export declare const TRANSPOSE_VISUAL_SEPARATOR = "\u203A";
export declare function getTransposeId(value: string, columnId: string): string;
export declare function isTransposeId(id: string): boolean;
export declare function getOriginalId(id: string): string;
export declare function parseTransposeId(id: string): {
    id: string;
    values: string[];
} | undefined;

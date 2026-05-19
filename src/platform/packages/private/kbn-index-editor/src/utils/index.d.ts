import type { DeleteDocAction, DocUpdate } from '../types';
export declare function parsePrimitive(value: unknown): string | number | boolean | object | unknown;
export declare function isPlaceholderColumn(columnName: string): boolean;
/**
 * Converts a cell value to a string for display purposes.
 */
export declare function getCellValue(value: unknown): string | undefined;
export declare function isDocUpdate(update: unknown): update is {
    type: 'add-doc';
    payload: DocUpdate;
};
export declare function isDocDelete(update: unknown): update is DeleteDocAction;

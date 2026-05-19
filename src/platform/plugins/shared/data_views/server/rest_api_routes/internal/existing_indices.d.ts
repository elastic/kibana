import type { IRouter, RequestHandler } from '@kbn/core/server';
/**
 * Accepts one of the following:
 * 1. An array of field names
 * 2. A JSON-stringified array of field names
 * 3. A single field name (not comma-separated)
 * @returns an array of indices
 * @param indices
 */
export declare const parseIndices: (indices: string | string[]) => string[];
export declare const handler: RequestHandler<{}, {
    indices: string | string[];
}, string[]>;
export declare const registerExistingIndicesPath: (router: IRouter) => void;

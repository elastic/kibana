import type { SavedObjectsFindOptions, SavedObjectsFindInternalOptions, SavedObjectsFindResponse } from '@kbn/core-saved-objects-api-server';
import type { ApiExecutionContext } from './types';
export interface PerformFindParams {
    options: SavedObjectsFindOptions;
    internalOptions: SavedObjectsFindInternalOptions;
}
export declare const performFind: <T = unknown, A = unknown>({ options, internalOptions }: PerformFindParams, { registry, helpers, allowedTypes: rawAllowedTypes, mappings, client, extensions, }: ApiExecutionContext) => Promise<SavedObjectsFindResponse<T, A>>;

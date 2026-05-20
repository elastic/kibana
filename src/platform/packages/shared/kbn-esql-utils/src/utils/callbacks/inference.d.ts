import type { InferenceEndpointsAutocompleteResult } from '@kbn/esql-types';
/**
 * Fetches inference endpoints based on the provided task type.
 * @param http The HTTP service to use for the request.
 * @param taskType The type of inference task to get endpoints for.
 * @returns A promise that resolves to an InferenceEndpointsAutocompleteResult object.
 */
export declare const getInferenceEndpoints: (this: void | {
    forceRefresh?: boolean;
} | undefined, http: import("@kbn/core/public").HttpSetup, taskType: string) => Promise<InferenceEndpointsAutocompleteResult>;

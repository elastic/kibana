import type { IEsSearchResponse } from '@kbn/search-types';
/**
 * The response from the stop endpoint includes more fields that are not represented in the IEsSearchResponse interface, the most
 * relevant ones are included so that the response can be used in place of the original response.
 */
type FallbackPartialResponse = IEsSearchResponse & {
    rawResponse: IEsSearchResponse['rawResponse'] & {
        is_running: boolean;
        columns: Array<{
            name: string;
            type: string;
        }>;
        values: Array<Array<unknown>>;
    };
};
/**
 * When a search is aborted and the endpoint times out we need to make discover responsive again so the user isn't stuck on
 * an infinite loading loop. A minimal response can be returned in place so the "No results" message is displayed and the
 * user can continue to interact with the application.
 * @param id - The id of the search.
 * @returns A fallback partial response.
 */
export declare function getFallbackPartialResponse(id: string | undefined): FallbackPartialResponse;
export {};

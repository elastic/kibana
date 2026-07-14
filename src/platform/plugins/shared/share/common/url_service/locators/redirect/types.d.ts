import type { SerializableRecord } from '@kbn/utility-types';
import type { FormatSearchParamsOptions } from './format_search_params';
/**
 * @public
 * Serializable locator parameters that can be used by the redirect service to navigate to a
 * location in Kibana.
 *
 * When passed to the public `share` plugin `.navigate()` function, locator params will also
 * be migrated.
 */
export interface RedirectOptions<P extends SerializableRecord = unknown & SerializableRecord> {
    /** Locator ID. */
    id: string;
    /** Kibana version when locator params were generated. */
    version: string;
    /** Locator params. */
    params: P;
}
export interface GetRedirectUrlOptions extends FormatSearchParamsOptions {
    /**
     * Optional space ID to use when generating the URL.
     * If not provided:
     * - on the client the current space ID will be used.
     * - on the server the URL will be generated without a space ID.
     */
    spaceId?: string;
}

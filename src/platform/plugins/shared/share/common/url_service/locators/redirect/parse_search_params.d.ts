import type { SerializableRecord } from '@kbn/utility-types';
import type { RedirectOptions } from './types';
/**
 * Parses redirect endpoint URL path search parameters. Expects them in the
 * following form:
 *
 * ```
 * /r?l=<locator_id>&v=<version>&p=<params>
 * ```
 *
 * @param urlSearch Search part of URL path.
 * @returns Parsed out locator ID, version, and locator params.
 */
export declare function parseSearchParams<P extends SerializableRecord = unknown & SerializableRecord>(urlSearch: string): RedirectOptions<P>;

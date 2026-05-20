import type { AxiosInstance } from 'axios';
import type { FetchLike } from '@kbn/mcp-client';
/**
 * Builds a Fetch API–compatible function that delegates to a preconfigured
 * Axios instance. Use this when you already have an axios instance with auth,
 * SSL, and proxy configured (e.g. from getAxiosInstanceWithAuth) so that
 * McpClient can reuse the same transport and auth instead of duplicating it.
 *
 * @param axiosInstance - Axios instance with auth and any other config already applied
 * @returns A FetchLike suitable for passing to McpClient as the `fetch` option
 */
export declare function createFetchFromAxios(axiosInstance: AxiosInstance): FetchLike;

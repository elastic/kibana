/**
 * Response headers check to determine if the response is from Elasticsearch
 * @param headers Response headers
 * @returns boolean
 */
export declare const isSupportedEsServer: (headers: Record<string, string | string[] | undefined> | null | undefined) => boolean;
/**
 * Check to ensure that a 404 response does not come from Elasticsearch
 *
 * WARNING: This is a hack to work around for 404 responses returned from a proxy.
 * We're aiming to minimise the risk of data loss when consumers act on Not Found errors
 *
 * @param response response from elasticsearch client call
 * @returns boolean 'true' if the status code is 404 and the Elasticsearch product header is missing/unexpected value
 */
export declare const isNotFoundFromUnsupportedServer: (args: {
    statusCode: number | null;
    headers: Record<string, string | string[] | undefined> | null;
}) => boolean;

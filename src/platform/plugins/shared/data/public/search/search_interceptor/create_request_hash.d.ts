/**
 * Generate the hash for this request.
 *
 * Ignores the `preference` parameter since it generally won't
 * match from one request to another identical request.
 *
 * (Preference is used to ensure all queries go to the same set of shards and it doesn't need to be hashed
 * https://www.elastic.co/guide/en/elasticsearch/reference/current/search-shard-routing.html#shard-and-node-preference)
 */
declare function createRequestHash(keys: Record<string, any>): string;
/**
 * Generates the hash used as a key in the client-side request cache.
 */
export declare const createRequestHashForClientCache: typeof createRequestHash;
/**
 * Generates the hash for associating requests with background searches stored on the server.
 *
 * Ignores sessionId for compatibility with background searches created before https://github.com/elastic/kibana/pull/237191
 */
export declare const createRequestHashForBackgroundSearches: (keys: Record<string, any>) => string;
export {};

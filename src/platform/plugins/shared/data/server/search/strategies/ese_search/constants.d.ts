/**
 * This strategy is internal and should only be accessible to server-side code. We use a symbol because symbols are not
 * serializable and cannot be passed over the wire.
 * Note: This strategy does not provide authentication on behalf of the user and is subject to the same limitations as
 * `esClient.asInternalUser`. It is intended for internal use only where the server has already authenticated the user
 * through other means.
 */
export declare const INTERNAL_ENHANCED_ES_SEARCH_STRATEGY: unique symbol;

/**
 * @internal
 */
export declare const PRODUCT_RESPONSE_HEADER = "x-elastic-product";
/**
 * @internal
 */
export declare const PRODUCT_ORIGIN_HEADER = "x-elastic-product-origin";
/**
 * @internal
 */
export declare const USER_AGENT_HEADER = "user-agent";
/**
 * @internal
 */
export declare const AUTHORIZATION_HEADER = "authorization";
/**
 * @internal
 */
export declare const ES_SECONDARY_AUTH_HEADER = "es-secondary-authorization";
/**
 * @internal
 */
export declare const ES_SECONDARY_CLIENT_AUTH_HEADER = "es-secondary-x-client-authentication";
/**
 * @internal
 */
export declare const ES_CLIENT_AUTHENTICATION_HEADER = "x-client-authentication";
/**
 * @internal
 */
export declare const RESERVED_HEADERS: import("@kbn/utility-types").RecursiveReadonlyArray<string>;
/**
 * @internal
 */
export declare const DEFAULT_HEADERS: Readonly<{
    "x-elastic-product-origin": string;
}>;
/**
 * @internal
 */
export declare function getDefaultHeaders(kibanaVersion: string): {
    "user-agent": string;
    "x-elastic-product-origin": string;
};

/**
 * If a service is being shared on both the client and the server, and
 * the client code requires synchronous access to uiSettings, both client
 * and server should wrap the core uiSettings services in a function
 * matching this signature.
 *
 * This matches the signature of the public `core.uiSettings.get`, and
 * should only be used in scenarios where async access to uiSettings is
 * not possible.
 */
export type GetConfigFn = <T = any>(key: string, defaultOverride?: T) => T;

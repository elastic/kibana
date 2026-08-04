/**
 * Fetches the user's action connectors of a given type (`actionTypeId`).
 *
 * All connector-typed install-form fields share one cached fetch of the full
 * connector list (react-query dedupes by key); each hook instance filters to
 * its own type. Use {@link useInvalidateConnectors} after creating a connector
 * so every open picker refreshes.
 */
export declare function useConnectors(connectorType: string): import("@tanstack/react-query").UseQueryResult<import("@kbn/alerts-ui-shared").ActionConnector[], unknown>;
/** Invalidates the shared connector-list cache (e.g. after creating a connector). */
export declare function useInvalidateConnectors(): () => Promise<void>;

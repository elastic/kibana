export declare const CONNECTOR_ID = ".mcp";
export declare const CONNECTOR_NAME: string;
/**
 * MCP client version used by the connector.
 */
export declare const MCP_CLIENT_VERSION = "1.0.0";
export declare const MAX_RETRIES = 2;
/**
 * Sub-actions supported by the MCP connector.
 * Values must match the registered sub-action names in the backend.
 */
export declare enum SUB_ACTION {
    /** Initialize/test the connection to the MCP server */
    INITIALIZE = "test",
    /** List available tools from the MCP server */
    LIST_TOOLS = "listTools",
    /** Call a specific tool on the MCP server */
    CALL_TOOL = "callTool"
}

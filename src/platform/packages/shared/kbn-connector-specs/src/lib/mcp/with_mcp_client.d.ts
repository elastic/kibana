import type { ActionContext } from '../../connector_spec';
import { createMcpClientFromAxios } from './create_mcp_client_from_axios';
/**
 * Lifecycle helper for MCP-native v2 connectors: creates an McpClient from
 * the connector's Axios instance, connects, runs the callback, and disconnects.
 * Every action call gets a fresh MCP session (connect-per-action pattern).
 */
export declare const withMcpClient: <T>(ctx: ActionContext, fn: (mcp: ReturnType<typeof createMcpClientFromAxios>) => Promise<T>) => Promise<T>;

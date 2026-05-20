import type { AxiosInstance } from 'axios';
import type { Logger } from '@kbn/logging';
import { McpClient } from '@kbn/mcp-client';
export interface CreateMcpClientFromAxiosOpts {
    /** Logger for the MCP client */
    logger: Logger;
    /** Preconfigured axios instance (e.g. from getAxiosInstanceWithAuth); auth/SSL/proxy are used as-is */
    axiosInstance: AxiosInstance;
    /** MCP server URL (must match the base URL the axios instance is configured for) */
    url: string;
    /** Optional client name for the MCP client (default derived from url) */
    name?: string;
    /** Optional version string (default: '0.0.1') */
    version?: string;
}
/**
 * Creates an McpClient that uses the connector's existing axios instance for
 * all HTTP traffic. Auth, SSL, and proxy settings come from that axios
 * instance; no separate auth headers or custom fetch for SSL/proxy are needed.
 *
 * Use this in v2 connector action handlers so that MCP and REST use the same
 * transport and token refresh logic (e.g. OAuth) instead of duplicating it.
 */
export declare function createMcpClientFromAxios({ logger, axiosInstance, url, name, version, }: CreateMcpClientFromAxiosOpts): McpClient;

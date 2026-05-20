import type { ActionContext } from '../../connector_spec';
/**
 * Extracts text parts from MCP content and attempts to parse as JSON.
 * Falls back to the raw joined text if parsing fails.
 */
export declare const parseJsonTextFromContentParts: (content: Array<{
    type: string;
    text?: string;
}>) => unknown;
/**
 * Calls an MCP tool and returns the raw content parts.
 */
export declare const callToolContent: (ctx: ActionContext, toolName: string, args?: Record<string, unknown>) => Promise<import("@kbn/mcp-client").ContentPart[]>;
/**
 * Calls an MCP tool and returns the parsed JSON from its text content parts.
 */
export declare const callToolJson: (ctx: ActionContext, toolName: string, args?: Record<string, unknown>) => Promise<unknown>;

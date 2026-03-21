import { z } from '@kbn/zod/v4';
/**
 * These schemas were copied from Zod v3 schemas in src/platform/packages/shared/kbn-connector-schemas/mcp/schemas/v1.ts
 * and will be deprecated once kbn-connector-schemas will switch to Zod v4 or
 * the MCP connector will be refactored as a single-file connector.
 */
export declare const McpTestParamsSchema: z.ZodObject<{}, z.core.$strict>;
export declare const McpListToolsParamsSchema: z.ZodObject<{
    forceRefresh: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const McpCallToolParamsSchema: z.ZodObject<{
    name: z.ZodString;
    arguments: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, z.core.$strip>;
/**
 * Metadata about the provider of a tool.
 * Used for attribution, audit trails, and UI display.
 */
export declare const ToolProviderMetadataSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    type: z.ZodLiteral<"mcp">;
    uniqueId: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/**
 * A text content as part of a tool call response.
 */
export declare const TextPartSchema: z.ZodObject<{
    type: z.ZodLiteral<"text">;
    text: z.ZodString;
}, z.core.$strip>;
/**
 * Non-text content as part of a tool call response.
 */
export declare const NonTextPartSchema: z.ZodObject<{
    type: z.ZodString;
}, z.core.$loose>;
/**
 * Content part - either text or non-text content.
 */
export declare const ContentPartSchema: z.ZodUnion<readonly [z.ZodObject<{
    type: z.ZodLiteral<"text">;
    text: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodString;
}, z.core.$loose>]>;
/**
 * Response from calling a tool on the MCP client.
 */
export declare const McpCallToolResponseSchema: z.ZodObject<{
    content: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
        type: z.ZodLiteral<"text">;
        text: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodString;
    }, z.core.$loose>]>>;
    provider: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        type: z.ZodLiteral<"mcp">;
        uniqueId: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
/**
 * A tool available on the MCP client.
 */
export declare const ToolSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    inputSchema: z.ZodRecord<z.ZodString, z.ZodAny>;
    provider: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        type: z.ZodLiteral<"mcp">;
        uniqueId: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
/**
 * Response from listing the tools available on the MCP client.
 */
export declare const McpListToolsResponseSchema: z.ZodObject<{
    tools: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        inputSchema: z.ZodRecord<z.ZodString, z.ZodAny>;
        provider: z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            type: z.ZodLiteral<"mcp">;
            uniqueId: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
/**
 * Response from testing the MCP connection.
 */
export declare const McpTestResponseSchema: z.ZodObject<{
    connected: z.ZodBoolean;
    capabilities: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, z.core.$strip>;

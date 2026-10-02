# MCP-Native Connector Setup

Instructions for setting up a connector backed by an MCP server. MCP-native connectors get their own connector spec with typed actions that wrap MCP tools via `callToolJson`, `callToolContent`, and `withMcpClient`.

## Run the Scaffold Generator

```bash
node scripts/generate connector <name> --id ".<id>" --owner "<team>"
```

Replace `<team>` with the GitHub team that will own this connector (e.g., `@elastic/response-ops`, `@elastic/workchat-eng`, `@elastic/workflows-eng`). If unsure, ask the user which team should own the connector in CODEOWNERS.

This creates the standard scaffold. Then modify the spec to use the MCP-native pattern.

After running the generator, replace all `TODO:` placeholders in generated files with real content before proceeding.

## Implement the MCP-Native Connector Spec

Follow the Tavily and GitHub connectors as reference:
- `src/platform/packages/shared/kbn-connector-specs/src/specs/tavily/tavily.ts`
- `src/platform/packages/shared/kbn-connector-specs/src/specs/github/github.ts`

Input schemas and their inferred types (`SearchInput`, `GetFileInput`, `CallToolInput`, ...) live in
`types.ts`, as described in [connector-patterns.md](connector-patterns.md#input-schemas--types).

### Key elements:

1. **Schema**: Wrap in `lazySchema()` and include a `serverUrl` field pointing to the MCP server URL:
   ```typescript
   import { z, lazySchema } from '@kbn/zod/v4';
   import { UISchemas } from '../../connector_spec_ui';

   schema: lazySchema(() =>
     z.object({
       serverUrl: UISchemas.url('https://mcp.example.com/mcp/')
         .describe('MCP server URL')
         .meta({ label: 'Server URL' }),
     })
   ),
   ```

2. **Typed actions**: Create a typed action for each MCP tool. Set `isTool: true`, an explicit `scope`, and a plain-string `description`. Use `callToolJson` for actions that return JSON (the common case) and `callToolContent` for binary/file downloads:
   ```typescript
   import { withMcpClient, callToolJson, callToolContent } from '../../lib/mcp';

   actions: {
     // JSON-returning action (search, list, get metadata, etc.)
     search: {
       isTool: true,
       scope: 'read',
       description: 'Search for items by keyword. Returns matching results with IDs and summaries.',
       input: SearchInputSchema,
       handler: async (ctx, input: SearchInput) => {
         return callToolJson(ctx, 'exact_mcp_tool_name', input);
       },
     },
     // Binary/file download action — use callToolContent, not callToolJson
     downloadFile: {
       isTool: true,
       scope: 'read',
       description:
         'Download the content of a file. ' +
         'WARNING: Returns base64-encoded binary for non-text files — only call this when ' +
         'you have a plan to process the data (e.g. via an Elasticsearch ingest pipeline ' +
         'attachment processor). Large files produce very large payloads.',
       input: GetFileInputSchema,
       handler: async (ctx, input: GetFileInput) => {
         return callToolContent(ctx, 'get_file_content', { id: input.id });
       },
     },
   },
   ```

   Classify each wrapped tool's `scope` from what the MCP tool does, not from its name — see the `scope`
   section in [connector-patterns.md](connector-patterns.md#scope--classifying-side-effects-for-every-istool-true-action).

3. **Escape hatches**: Always include `listTools` and `callTool` actions for dynamic tool discovery. `callTool` can invoke any tool, so it is always `scope: 'destroy'`. Wrap their inline schemas in `lazySchema()`:
   ```typescript
   listTools: {
     isTool: true,
     scope: 'read',
     description: 'List all MCP tools exposed by the server. Useful for dynamic discovery.',
     input: lazySchema(() => z.object({})),
     handler: async (ctx) => {
       return withMcpClient(ctx, async (mcp) => {
         const { tools } = await mcp.listTools();
         return tools;
       });
     },
   },
   callTool: {
     isTool: true,
     scope: 'destroy',
     description: 'Call any MCP tool by name with arbitrary arguments. Use listTools first to discover available tools.',
     input: CallToolInputSchema,
     handler: async (ctx, input: CallToolInput) => {
       return callToolContent(ctx, input.name, input.arguments);
     },
   },
   ```

   With `CallToolInputSchema` in `types.ts`:
   ```typescript
   export const CallToolInputSchema = lazySchema(() =>
     z.object({
       name: z.string().min(1).max(200).describe('The MCP tool name (from listTools)'),
       arguments: z
         .record(z.string().max(200), z.unknown())
         .optional()
         .describe('Tool arguments as a key/value map'),
     })
   );
   export type CallToolInput = z.infer<typeof CallToolInputSchema>;
   ```

4. **Connection test**: Include a test handler that validates the MCP connection. Keep `enabled: true`, or the "Test connector" button stays disabled:
   ```typescript
   test: {
     enabled: true,
     description: i18n.translate('connectorSpecs.yourConnector.test.description', {
       defaultMessage: 'Verifies connection to the Your Service MCP server.',
     }),
     handler: async (ctx) => {
       return withMcpClient(ctx, async (mcp) => {
         const { tools } = await mcp.listTools();
         return { ok: true, message: `Connected. ${tools.length} tools available.` };
       });
     },
   },
   ```

## MCP Tool Discovery

Use the connector's `listTools` action to discover the **exact MCP tool names** before writing action handlers. Tool names often use underscores (e.g., `tavily_search`) even when documentation shows hyphens.

After creating the connector instance in Kibana, verify tool names via:

```bash
source "$(git rev-parse --show-toplevel)/scripts/kibana_api_common.sh"
kibana_curl -X POST -H "Content-Type: application/json" \
  "$KIBANA_URL/api/actions/connector/<connector_id>/_execute" \
  -d '{"params":{"subAction":"listTools","subActionParams":{}}}'
```

During initial creation, use names from MCP server documentation but be prepared to fix them during testing.

## Descriptions and Skill Content

Action `description`s, parameter `.describe()` text, and the `skill` property follow the same rules as
any other connector — see Step 3 of [SKILL.md](../SKILL.md) and the "LLM-Quality Descriptions and Skill
Content" section of [connector-patterns.md](connector-patterns.md#llm-quality-descriptions-and-skill-content).
For an MCP connector, the `skill` text should also point agents at `listTools` and `callTool` for tools
not covered by typed actions.

## Shared MCP Library

Use these utilities from `src/platform/packages/shared/kbn-connector-specs/src/lib/mcp/` (import them from `'../../lib/mcp'`):

- `withMcpClient(ctx, fn)` (`with_mcp_client.ts`) — creates an MCP client for the connector's `serverUrl`, passes it to `fn`, and closes it afterwards
- `callToolJson(ctx, toolName, args)` / `callToolContent(ctx, toolName, args)` (`call_tool_helpers.ts`) — call one MCP tool and return its JSON or raw content
- `create_mcp_client_from_axios.ts` — creates an MCP client from an Axios-based connector context; used by `withMcpClient`

## ID Alignment

Follow the [ID alignment rules in connector-patterns.md](connector-patterns.md#critical-id-alignment).

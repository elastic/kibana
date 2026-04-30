# MCP-Native Connector Setup

Instructions for setting up a connector backed by an MCP server. MCP-native connectors get their own connector spec with typed actions that wrap MCP tools via `withMcpClient`.

## Run the Scaffold Generator

```bash
node scripts/generate connector <name> --id ".<id>" --owner "<team>"
```

Replace `<team>` with the GitHub team that will own this connector (e.g., `@elastic/response-ops`, `@elastic/workchat-eng`, `@elastic/workflows-eng`). If unsure, ask the user which team should own the connector in CODEOWNERS.

This creates the standard scaffold. Then modify the spec to use the MCP-native pattern.

## Implement the MCP-Native Connector Spec

Follow the GitHub and Tavily connectors as reference:
- `src/platform/packages/shared/kbn-connector-specs/src/specs/github/github.ts`
- `src/platform/packages/shared/kbn-connector-specs/src/specs/tavily/tavily.ts`

### Key elements:

1. **Schema**: Include a `serverUrl` field pointing to the MCP server URL:
   ```typescript
   import { UISchemas } from '../../connector_spec_ui';

   schema: z.object({
     serverUrl: UISchemas.url('https://mcp.example.com/mcp/')
       .describe('MCP server URL')
       .meta({ label: 'Server URL' }),
   }),
   ```

2. **Typed actions**: Create a typed action for each MCP tool, using `withMcpClient`. Set `isTool: true` and add a plain-string `description`:
   ```typescript
   import { withMcpClient } from '../../lib/mcp/with_mcp_client';

   actions: {
     search: {
       isTool: true,
       description: 'Search for items by keyword. Returns matching results with IDs and summaries.',
       input: SearchInputSchema,
       handler: withMcpClient(async (client, input) => {
         return client.callTool({ name: 'exact_mcp_tool_name', arguments: input });
       }),
     },
   },
   ```

3. **Escape hatches**: Always include `listTools` and `callTool` actions for dynamic tool discovery:
   ```typescript
   listTools: {
     isTool: true,
     description: 'List all MCP tools exposed by the server. Useful for dynamic discovery.',
     input: z.object({}),
     handler: withMcpClient(async (client) => {
       return client.listTools();
     }),
   },
   callTool: {
     isTool: true,
     description: 'Call any MCP tool by name with arbitrary arguments. Use listTools first to discover available tools.',
     input: z.object({
       name: z.string().describe('The MCP tool name (from listTools)'),
       arguments: z.record(z.unknown()).optional().describe('Tool arguments as a key/value map'),
     }),
     handler: withMcpClient(async (client, input) => {
       return client.callTool(input);
     }),
   },
   ```

4. **Connection test**: Include a test handler that validates the MCP connection.

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

## Write LLM-Quality Descriptions and Skill Content

Good descriptions make typed actions discoverable and usable by LLMs. Apply descriptions at three levels:

1. **Action-level `description`**: Describe what the action does and when to use it. Use plain strings (not `i18n.translate()`) — action descriptions are for LLM consumption only.
   ```typescript
   actions: {
     search: {
       isTool: true,
       description: 'Search for repositories, code, issues, and other GitHub content using GitHub search syntax.',
       input: SearchInputSchema,
       handler: withMcpClient(async (client, input) => { ... }),
     },
   },
   ```

2. **Param-level `.describe()`**: Add `.describe()` to every Zod field in the input schema. This tells the LLM what each parameter means and what values are valid.
   ```typescript
   const SearchInputSchema = z.object({
     query: z.string().describe('GitHub search query using GitHub search syntax (e.g., "repo:elastic/kibana is:open label:bug")'),
     type: z.enum(['repositories', 'code', 'issues', 'users']).describe('The type of GitHub content to search'),
   });
   ```

3. **`skill` property** (optional): Provide a `skill` string on the connector spec to give the LLM high-level guidance on multi-step patterns and gotchas. Use the `[...].join('\n')` pattern:
   ```typescript
   skill: [
     'Use search to find items by keyword, then getItem to retrieve full details by ID.',
     'For tools not covered by typed actions, use listTools to discover available MCP tools, then call them with callTool.',
   ].join('\n'),
   ```

## Shared MCP Library

Use these utilities from `src/platform/packages/shared/kbn-connector-specs/src/lib/mcp/`:

- `with_mcp_client.ts` — wraps a handler to automatically create and manage the MCP client
- `create_mcp_client_from_axios.ts` — creates an MCP client from an Axios-based connector context
- `call_tool_helpers.ts` — helpers for calling MCP tools

## ID Alignment

MCP-native connectors follow the same ID alignment rules as custom connectors:

1. `ConnectorSpec.metadata.id` in the connector spec
2. Key in `ConnectorIconsMap` in `connector_icons_map.ts`

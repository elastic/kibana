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

2. **Typed actions**: Create a typed action for each MCP tool, using `withMcpClient`:
   ```typescript
   import { withMcpClient } from '../../lib/mcp/with_mcp_client';

   actions: {
     search: {
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
     input: z.object({}),
     handler: withMcpClient(async (client) => {
       return client.listTools();
     }),
   },
   callTool: {
     input: z.object({
       name: z.string(),
       arguments: z.record(z.unknown()).optional(),
     }),
     handler: withMcpClient(async (client, input) => {
       return client.callTool(input);
     }),
   },
   ```

4. **Connection test**: Include a test handler that validates the MCP connection.

## MCP Tool Discovery

Use the connector's `listTools` action to discover the **exact MCP tool names** before writing workflows. Tool names often use underscores (e.g., `tavily_search`) even when documentation shows hyphens.

After creating the connector instance in Kibana, verify tool names via:

```bash
source "$(git rev-parse --show-toplevel)/scripts/kibana_api_common.sh"
kibana_curl -X POST -H "Content-Type: application/json" \
  "$KIBANA_URL/api/actions/connector/<connector_id>/_execute" \
  -d '{"params":{"subAction":"listTools","subActionParams":{}}}'
```

During initial creation, use names from MCP server documentation but be prepared to fix them during testing.

## Create Workflows

Workflows for MCP-native connectors call the typed actions directly (not the generic `mcp.callTool`):

```yaml
steps:
  - id: search_step
    type: your_connector.search
    connector-id: <%= your_connector-stack-connector-id %>
    params:
      query: ${{ inputs.query }}
```

The step `type` should be `{connectorSpecId_without_dot}.{actionName}` (e.g., `github.searchCode`).

See [connector-patterns.md](connector-patterns.md) for the full workflow YAML pattern.

## Shared MCP Library

Use these utilities from `src/platform/packages/shared/kbn-connector-specs/src/lib/mcp/`:

- `with_mcp_client.ts` — wraps a handler to automatically create and manage the MCP client
- `create_mcp_client_from_axios.ts` — creates an MCP client from an Axios-based connector context
- `call_tool_helpers.ts` — helpers for calling MCP tools

## ID Alignment

MCP-native connectors follow the same ID alignment rules as custom connectors:

1. `ConnectorSpec.metadata.id` in the connector spec
2. Key in `ConnectorIconsMap` in `connector_icons_map.ts`

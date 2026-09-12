# MCP-native connector review

Use this reference when the connector under review is **MCP-native** (uses `withMcpClient` to wrap MCP tools as typed actions). Apply these checks in addition to the main checklist in the skill.

## Connector spec (MCP-native)

- Uses `withMcpClient` from `lib/mcp/with_mcp_client` for action handlers.
- Has a `serverUrl` config field pointing to the MCP server.
- Includes `listTools` and `callTool` escape-hatch actions for dynamic tool discovery.
- Action names correspond to actual MCP tool names. Tool names use **underscores** (e.g. `tavily_search`), not hyphens. Validate against the MCP server's `listTools` response or server docs.
- Has a connection test handler that validates the MCP connection works.
- **`lazySchema()` wrapping**: Every schema in `types.ts` — and every inline `z.object()` used as an action `input` — must be wrapped with `lazySchema(() => z.object({...}))`. Bare `z.object()` is a runtime behavior difference, not just style. Flag any schema that is not wrapped.
- **`callToolJson` vs `callToolContent`**: Typed data actions (search, list, get) should use `callToolJson(ctx, 'tool_name', args)`, which parses the MCP response as JSON. File download or binary actions must use `callToolContent(ctx, 'tool_name', args)`, which returns raw content parts. Using `callToolJson` on a binary response will corrupt the data. Flag any download/file action that uses `callToolJson`.
- **Test file mock pattern**: The test file must mock `withMcpClient` with both `mockCallTool` and `mockListTools` so handlers do not require a real MCP transport. Flag test files that lack this mock or that try to instantiate a real MCP client.

## Thorough check (optional)

Run when the user asks for **thorough** or **deep** validation:

1. **Vendor API**: Find official MCP server docs; map actions to MCP tools; confirm auth format.
2. **Input validation**: Compare action input schema to the MCP tool's `inputSchema` — parameter names, required vs optional, types, constraints. Report mismatches.
3. **Output shape**: Compare expected response shape to the actual MCP response. Report expected vs actual for any mismatch.
4. **No assumptions**: The MCP API may not match the REST API, so stick to MCP documentation.

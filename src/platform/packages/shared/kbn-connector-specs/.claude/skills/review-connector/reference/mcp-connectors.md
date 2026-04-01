# MCP-native connector review

Use this reference when the connector under review is **MCP-native** (uses `withMcpClient` to wrap MCP tools as typed actions). Apply these checks in addition to the main checklist in the skill.

## Connector spec (MCP-native)

- Uses `withMcpClient` from `lib/mcp/with_mcp_client` for action handlers.
- Has a `serverUrl` config field pointing to the MCP server.
- Includes `listTools` and `callTool` escape-hatch actions for dynamic tool discovery.
- Action names correspond to actual MCP tool names. Tool names use **underscores** (e.g. `tavily_search`), not hyphens. Validate against the MCP server's `listTools` response or server docs.
- Has a connection test handler that validates the MCP connection works.

## Workflows (MCP-native)

- Step `type` uses the connector's typed action (e.g. `github.searchCode`, `tavily.search`), NOT the generic `mcp.callTool`.
- Only pass parameters that the MCP tool accepts. Check the tool's `inputSchema`; some params in third-party docs may be outdated or unavailable via MCP. Verify with `listTools` or the MCP server documentation.
- Connector reference uses the spec's own template variable (e.g. `<%= tavily-stack-connector-id %>`), NOT `<%= mcp-stack-connector-id %>`.

## Thorough check (optional)

Run when the user asks for **thorough** or **deep** validation:

1. **Vendor API**: Find official MCP server docs; map actions to MCP tools; confirm auth format.
2. **Input validation**: Compare action input schema to the MCP tool's `inputSchema` — parameter names, required vs optional, types, constraints. Report mismatches.
3. **Output shape**: Compare expected response shape to the actual MCP response. Report expected vs actual for any mismatch.
4. **No assumptions**: The MCP API may not match the REST API, so stick to MCP documentation.

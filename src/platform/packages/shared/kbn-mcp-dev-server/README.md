# @kbn/mcp-dev-server

`@kbn/mcp-dev-server` starts a local Model Context Protocol (MCP) server that Kibana engineers can run while working on Kibana.

For more information on Model Context Protocol, see [modelcontextprotocol.io](https://modelcontextprotocol.io/).

## Running

From the Kibana repo root:

```bash
node scripts/mcp_dev
```

This starts a [stdio](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#stdio) MCP Server.

## Windsurf configuration example

Add the following snippet to your `~/.codeium/windsurf/mcp_config.json` to let Windsurf automatically start/attach to the dev server (it assumes you use `nvm`):

```ts
{
  "mcpServers": {
    "Kibana Dev": {
      "command": "bash",
      "args": [
        "-lc",
        "source \"$NVM_DIR/nvm.sh\" && cd ${workspaceFolder} && nvm use --silent && node --no-experimental-require-module ./scripts/mcp_dev.js"
      ]
    }
  }
}
```

For more information on Windsurf's MCP integration, see [docs.windsurf.com](https://docs.windsurf.com/windsurf/cascade/mcp).

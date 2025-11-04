# @kbn/scout-mcp

Model Context Protocol (MCP) server that exposes Scout's browser testing capabilities to AI assistants like Cursor.

## What This Does

This MCP server allows you to use Scout (Kibana's browser test framework) directly from Cursor to:
- Navigate Kibana and interact with the UI
- Test UI components and user flows using browser automation
- Take screenshots and debug tests
- Run test scenarios interactively

## Quick Setup for Cursor

### 1. Start Scout Server

**MCP requires SAML authentication to be configured.** Start Kibana using Scout's `start-server` command, which pre-configures SAML:

```bash
node scripts/scout.js start-server --stateful
```

This command:
- Starts Elasticsearch and Kibana with SAML authentication pre-configured
- Runs Kibana on port **5620** (default)
- Sets up the mock IdP plugin for local SAML authentication
- Configures the correct SAML realm for testing

**Default URLs:**
- Kibana: `http://localhost:5620`
- Elasticsearch: `http://localhost:9220`

### 2. Configure Cursor MCP

Open Cursor Settings → Features → MCP Servers, or edit:
- **macOS**: `~/Library/Application Support/Cursor/User/globalStorage/mcp.json`
- **Windows**: `%APPDATA%\Cursor\User\globalStorage\mcp.json`
- **Linux**: `~/.config/Cursor/User/globalStorage/mcp.json`

Add this configuration:

```json
{
  "mcpServers": {
    "scout": {
      "command": "bash",
      "args": [
        "-c",
        "cd /path/to/kibana && npx tsx packages/kbn-scout-mcp/bin/cli.ts --target http://localhost:5620"
      ]
    }
  }
}
```

**Configuration Notes:**
- Replace `/path/to/kibana` with your actual Kibana repository path (use absolute path)
- The default target URL is `http://localhost:5620` (Scout's default port)
- To use a different Kibana instance, change the `--target` URL, but ensure SAML is configured
- The `bash -c` approach is required because Cursor's MCP implementation needs the explicit `cd` command

### 3. Restart Cursor

Completely quit Cursor (Cmd+Q on Mac) and restart it.

### 4. Start Using Scout

In Cursor chat, you can now ask:
- "Navigate to the Discover app"
- "Take a screenshot of the dashboard"
- "Use Scout to interact with the filter bar"

## Available Tools

The MCP server provides these capabilities:

**Browser Automation**
- `scout_navigate` - Navigate to Kibana apps or URLs
- `scout_click` - Click elements
- `scout_type` - Type into input fields
- `scout_wait_for` - Wait for elements or conditions
- `scout_screenshot` - Take screenshots
- `scout_snapshot` - Get page structure

**EUI Components**
- `scout_eui_component` - Interact with Elastic UI components
- `scout_list_eui_components` - See available components

**Authentication**
- `scout_login` - Login with admin/viewer roles
- `scout_logout` - Logout
- `scout_get_auth_status` - Check auth state

## Example Usage in Cursor

```
You: Navigate to Discover and add a filter for field "status" equals "200"

Cursor will use Scout MCP to:
1. Navigate to the Discover app
2. Click the add filter button and fill in the filter details
3. Verify the filter is applied
```

```
You: Take a screenshot of the current Dashboard page

Cursor will use Scout to capture and save the screenshot
```

## Debugging Failed Tests

When a test fails, use Scout MCP to debug interactively in Cursor:

```
My test is failing. Use Scout to:
1. Take a screenshot
2. Get current URL and page title
3. Check if I'm logged in
4. Get a page snapshot
```

Scout provides powerful debugging tools:
- **Screenshots** - See the actual page state
- **Page snapshots** - Inspect DOM structure and find correct selectors
- **State inspection** - Check URL, auth status, error messages
- **Step-by-step execution** - Run test incrementally with screenshots

## Troubleshooting

**"No server info found"**
- Verify the Kibana path in your MCP config is correct (in the `cd` command)
- Make sure Kibana repository exists at that path
- Check Cursor logs for detailed errors

**"Cannot find module" or "ERR_MODULE_NOT_FOUND"**
- Verify the path in the `cd` command is correct
- Run `yarn kbn bootstrap` from Kibana root directory
- Make sure you're using the `bash -c` command format shown above

**Git repository errors**
- Ensure the path in the `cd` command points to your Kibana repo root

## License

Elastic License 2.0 OR AGPL-3.0-only OR SSPL-1.0

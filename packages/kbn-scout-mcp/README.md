# @kbn/scout-mcp

Model Context Protocol (MCP) server that exposes Scout's browser testing capabilities to AI assistants like Cursor.

## What This Does

This MCP server allows you to use Scout (Kibana's browser test framework) directly from Cursor to:
- Navigate Kibana and interact with the UI
- Use Scout page objects (Discover, Dashboard, etc.)
- Test UI components and user flows
- Take screenshots and debug tests
- Run test scenarios interactively

## Quick Setup for Cursor

### 1. Configure Cursor MCP

Open Cursor Settings → Features → MCP Servers, or edit:
- **macOS**: `~/Library/Application Support/Cursor/User/globalStorage/mcp.json`

Add this configuration:

```json
{
  "mcpServers": {
    "scout": {
      "command": "bash",
      "args": [
        "-c",
        "cd /Users/enrique/workspace/kibana && npx tsx packages/kbn-scout-mcp/bin/cli.ts --target http://localhost:5601"
      ]
    }
  }
}
```

**Important**:
- Replace `/Users/enrique/workspace/kibana` with your actual Kibana path (appears twice in the command)
- Use the full absolute path to your Kibana repository
- Make sure Kibana is running on `http://localhost:5601` (or change the target URL)
- The `bash -c` approach is required because Cursor's MCP implementation needs the explicit `cd` command

### 2. Restart Cursor

Completely quit Cursor (Cmd+Q on Mac) and restart it.

### 3. Start Using Scout

In Cursor chat, you can now ask:
- "Navigate to the Discover app"
- "Take a screenshot of the dashboard"
- "Use Scout to test the filter bar"
- "List available Scout page objects"

## Available Tools

The MCP server provides these capabilities:

**Browser Automation**
- `scout_navigate` - Navigate to Kibana apps or URLs
- `scout_click` - Click elements
- `scout_type` - Type into input fields
- `scout_wait_for` - Wait for elements or conditions
- `scout_screenshot` - Take screenshots
- `scout_snapshot` - Get page structure

**Scout Page Objects**
- `scout_page_object` - Use high-level Scout page objects
- `scout_list_page_objects` - See available page objects

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
2. Use the filterBar page object to add the filter
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

See **DEBUGGING.md** for comprehensive debugging guide and **DEBUG_QUICK_REF.md** for quick reference commands.

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

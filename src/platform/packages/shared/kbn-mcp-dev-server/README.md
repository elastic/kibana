# @kbn/mcp-dev-server

`@kbn/mcp-dev-server` starts a local Model Context Protocol (MCP) server that Kibana engineers can run while working on Kibana.

For more information on Model Context Protocol, see [modelcontextprotocol.io](https://modelcontextprotocol.io/).

## Running

From the Kibana repo root:

```bash
node scripts/mcp_dev
```

This starts a [stdio](https://modelcontextprotocol.io/specification/2025-06-18/transports#stdio) MCP Server.

## MCP configuration example

Add the following snippet to your settings for your AI Coding IDE so it will automatically start/attach to the dev server (it assumes you use `nvm`):

```ts
{
  "mcpServers": {
    "Kibana Dev": {
      "command": "bash",
      "args": [
        "-lc",
        "source \"$NVM_DIR/nvm.sh\" && cd ${KIBANA_WORKSPACE} && nvm use --silent && node --no-experimental-require-module ./scripts/mcp_dev.js"
      ]
    }
  }
}
```

For Gemini CLI with sandbox enabled, you will need to create a custom Seatbelt profile in `$KIBANA_WORKSPACE/.gemini/sandbox-macos-kibana.sb` like:

```
(version 1)

;; allow everything by default
(allow default)

;; deny all writes EXCEPT under specific paths
(deny file-write*)
(allow file-write*
    (subpath (param "TARGET_DIR"))
    (subpath (param "TMP_DIR"))
    (subpath (param "CACHE_DIR"))
    (subpath (string-append (param "HOME_DIR") "/.gemini"))
    (subpath (string-append (param "HOME_DIR") "/.npm"))
    (subpath (string-append (param "HOME_DIR") "/.nvm"))
    (subpath (string-append (param "HOME_DIR") "/.cache"))
    (subpath (string-append (param "HOME_DIR") "/.gitconfig"))
    ;; Allow writes to included directories from --include-directories
    (subpath (param "INCLUDE_DIR_0"))
    (subpath (param "INCLUDE_DIR_1"))
    (subpath (param "INCLUDE_DIR_2"))
    (subpath (param "INCLUDE_DIR_3"))
    (subpath (param "INCLUDE_DIR_4"))
    (literal "/dev/stdout")
    (literal "/dev/stderr")
    (literal "/dev/null")
)

```

Then add environment file named `$KIBANA_WORKSPACE/.env` file to your KIBANA_WORKSPACE with:
```env
SEATBELT_PROFILE=kibana
```

ProTip: Create a global `.gitignore_global` to exclude `.env` and `.gemini` directories so they don't get commited.

# Adding a New Tool to the MCP Dev Server

This document outlines the process of adding a new tool to the MCP dev server.

## 1. Create a Tool File

Create a new file for your tool inside `src/platform/packages/shared/kbn-mcp-dev-server/src/tools`. The file name should be descriptive of the tool's functionality (e.g., `my_new_tool.ts`).

## 2. Implement the Tool Definition

Inside the new file, create a `ToolDefinition` object. This object will contain the tool's name, description, input schema, and handler function.

**Example:** `src/platform/packages/shared/kbn-mcp-dev-server/src/tools/my_new_tool.ts`

```typescript
import { z } from '@kbn/zod';
import { ToolDefinition } from '@kbn/mcp-server-common';

// Define the input schema for your tool using Zod
const myNewToolInputSchema = z.object({
  myArgument: z.string().describe("A description for this argument"),
});

// Implement the tool's logic in a function
async function myNewTool(input: z.infer<typeof myNewToolInputSchema>): Promise<string> {
  // Your tool's logic goes here
  return `You passed the argument: ${input.myArgument}`;
}

// Create the tool definition
export const myNewTool: ToolDefinition<typeof myNewToolInputSchema> = {
  name: 'my_new_tool',
  description: 'A brief description of what my new tool does.',
  inputSchema: myNewToolInputSchema,
  handler: async (input) => {
    const result = await myNewTool(input);
    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  },
};
```

## 3. Register the Tool

Open `src/platform/packages/shared/kbn-mcp-dev-server/src/server/index.ts` and follow these steps:

### a. Import the Tool

Add an import statement at the top of the file to import your new tool's definition.

```typescript
import { myNewTool } from '../tools/my_new_tool';
```

### b. Register the Tool with the Server

Use the `addTool` helper function to register your new tool.

```typescript
addTool(server, myNewTool);
```

By following these steps, you can successfully add and register a new tool to the MCP dev server, making it available for use.

# Available Tools

The following tools are available in the MCP Dev Server.

# Semantic Code Search

For semantic code search, please use the [semantic-code-search-mcp-server](https://github.com/elastic/semantic-code-search-mcp-server). This server provides a suite of tools for exploring and understanding the Kibana codebase.

Contact @simianhacker for details on how to get started.


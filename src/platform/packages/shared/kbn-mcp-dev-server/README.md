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

## `code_search`

Performs a semantic search of the Kibana codebase using a unified Elasticsearch index. This tool is ideal for a "chain of investigation" approach to exploring the codebase.

### Parameters
- `query` (string, optional): The semantic query string to search for.
- `kql` (string, optional): The KQL filter to apply to the search.
- `size` (number, optional, default: 20): The number of results to return.
- `page` (number, optional, default: 1): The page of results to return.

## `get_distinct_values`

Retrieves all unique values for a specified field from the code search index. Can be filtered with an optional KQL query.

### Parameters
- `field` (enum): The field for which to retrieve distinct values. Can be 'type', 'language', 'kind', 'filePath', or 'imports'.
- `kql` (string, optional): An optional KQL filter to apply before aggregating.

## `find_usages`

Analyzes a code symbol's usage across the entire codebase and generates a rich, categorized report. Use this tool to quickly understand a symbol's architectural role, differentiate between its definition, execution sites, and type declarations, and discover where it is referenced in tests and documentation. This is a primary tool for high-level code intelligence and analysis.

### Parameters
- `symbol` (string): The symbol to find usages for.

## Index Setup

Before using the search-related tools, you must set up the Elasticsearch index using the [semantic-code-search-indexer](https://github.com/elastic/semantic-code-search-indexer). Follow the instructions in the indexer's README to clone, configure, and build the tool.

Once the indexer is set up, run the following command from the `semantic-code-search-indexer` directory to index the Kibana codebase:

```bash
npm run index -- --clean ../kibana
```

## Running the Server with Search Tools

To use the search tools, you need to configure the MCP Dev Server to connect to your Elasticsearch instance. This is done by setting the following environment variables:

| Variable | Description | Default |
| --- | --- | --- |
| `ELASTICSEARCH_ENDPOINT` | The URL of your Elasticsearch instance. | `http://localhost:9200` |
| `ELASTICSEARCH_USERNAME` | The username for Elasticsearch authentication. | `elastic` |
| `ELASTICSEARCH_PASSWORD` | The password for Elasticsearch authentication. | `changeme` |
| `ELASTICSEARCH_CLOUD_ID` | The Cloud ID for the Elasticsearch instance. | |
| `ELASTICSEARCH_API_KEY` | An API key for Elasticsearch authentication. | |
| `ELASTICSEARCH_INDEX` | The name of the Elasticsearch index to use. | `kibana-code-search` |
| `ELASTICSEARCH_INFERENCE_ID` | The ID of the ELSER model to use. | `.elser_model_2` |

You can set these variables in your shell, or by creating a `.env` file in the root of the Kibana project.

## MCP configuration example for code search

The example below is shows how to set the ENV variables for connection to a Elasticseach cloud instance:

```ts
{
  "mcpServers": {
    "Kibana Dev": {
      "command": "bash",
      "args": [
        "-lc",
        "source \"$NVM_DIR/nvm.sh\" && cd ${KIBANA_WORKSPACE} && nvm use --silent && ELASTICSEARCH_API_KEY=\"<API_KEY_GOES_HERE>\" ELASTICSEARCH_CLOUD_ID=\"<CLOUD_ID_GOES_HERE>\" node --no-experimental-require-module ./scripts/mcp_dev.js"
      ]
    }
  }
}
```

Contact @simianhacker to get connection details for a cloud instance that already has the Kibana codebase indexed.

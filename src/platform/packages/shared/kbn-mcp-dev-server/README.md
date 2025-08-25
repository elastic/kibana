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

## `code_search` Tool

The `code_search` tool performs a semantic search of the Kibana codebase using a unified Elasticsearch index. This tool is ideal for a "chain of investigation" approach to exploring the codebase.

### Index Setup

Before using the `code_search` tool, you must set up the Elasticsearch index using the [semantic-code-search-indexer](https://github.com/elastic/semantic-code-search-indexer). Follow the instructions in the indexer's README to clone, configure, and build the tool.

Once the indexer is set up, run the following command from the `semantic-code-search-indexer` directory to index the Kibana codebase:

```bash
npm run index -- --clean ../kibana
```

### "Chain of Investigation" Example: How to set up a server route repository

Here is an example of how to use the `code_search` tool to investigate how to set up a server route repository in Kibana.

**1. Broad Search:** Start with a broad query to find the most relevant files.

```
code_search("server route repository")
```

The top hit from this search is the `README.md` file for the `@kbn/server-route-repository` package. This is the perfect place to start, as it provides a high-level overview of the feature.

**2. Read the Documentation:** Read the `README.md` file to get a high-level understanding of the feature and how to use it. The `README.md` mentions three key functions: `createServerRouteFactory`, `registerRoutes`, and `createRepositoryClient`.

**3. Investigate `createServerRouteFactory`:** Based on the `README.md`, the next logical step is to investigate the `createServerRouteFactory` function, as it's the entry point for creating routes.

```
code_search("createServerRouteFactory")
```

The search results confirm that this is the correct starting point and show the source code for the function.

**4. Investigate `registerRoutes`:** The `README.md` also mentions that after creating routes, you need to register them using `registerRoutes`. This is the next logical step in our investigation.

```
code_search("registerRoutes")
```

The search results for `registerRoutes` confirm that it's the function used to register the route repository with the Kibana server.

**5. Investigate `createRepositoryClient`:** The final piece of the puzzle is the client-side implementation. The `README.md` mentions `createRepositoryClient` for this purpose.

```
code_search("createRepositoryClient")
```

The search results for `createRepositoryClient` confirm that it's the correct function for creating a typed client on the browser.

### How effective is the `code_search` tool for accomplishing this?

The `code_search` tool was extremely effective. It was the key to providing accurate and comprehensive answers.

Here's a breakdown of why it worked so well for this "chain of investigation":

1.  **It Found the "Source of Truth" Immediately:** My first query, "server route repository," led me directly to the `README.md` file for the `@kbn/server-route-repository` package. In a large codebase like Kibana, finding the primary documentation for a specific feature is often the biggest challenge. The semantic search understood the concept and prioritized the documentation, which was the perfect starting point.

2.  **It Enabled a Top-Down Approach:** Instead of starting with low-level code and trying to piece together the bigger picture, I could start with the high-level explanation in the `README.md`. This document contained clear explanations and code examples for the exact questions you asked: how to use the client, how to implement an API, and how to add dependencies.

3.  **It Provided Contextual Clues:** Even the other search results that I didn't use directly were valuable. They showed me related test files and type definitions, confirming that `@kbn/server-route-repository` was indeed the central package for this functionality.

Without the `code_search` tool, I would have had to rely on file-based searches (`grep` or `find`), which would have been much slower and less precise. I would have gotten many irrelevant results and would have had to manually read through numerous files to find the same information. The semantic search cut through the noise and took me straight to the most relevant information.

## Running the Server with `code_search`

To use the `code_search` tool, you need to configure the MCP Dev Server to connect to your Elasticsearch instance. This is done by setting the following environment variables:

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
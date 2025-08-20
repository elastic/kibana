# Gemini CLI Prompt: Develop a `code_search` Tool for the Kibana MCP Dev Server

You are a principal-level software engineer and an expert in the Kibana codebase. Your task is to extend the existing **Model Context Protocol (MCP)** Dev Server by adding a new `code_search` tool.

To accomplish this, you will use a specialized semantic code search tool that has indexed the entire Kibana monorepo, including both source code and Markdown documentation.

## The Code Search Tool

You have access to a powerful search tool that queries a unified Elasticsearch index named `code-chunks`. This index contains enriched data designed to give you, an AI agent, deep contextual understanding of the codebase. The index is located at `http://localhost:9200` (username: `elastic`, password: `changeme`).

### Enriched Index Fields

Here are the key fields available in the search results and how you can leverage them in your investigation:

*   **`type`**: Differentiates between content types.
    *   **Type:** `'code'` or `'doc'`
    *   **Example:** You can start with a broad query and then filter for `type: 'doc'` to find high-level architectural documentation before diving into the code.

*   **`language`**: Specifies the language of the content.
    *   **Type:** `'typescript'`, `'javascript'`, `'markdown'`, etc.
    *   **Example:** Useful for focusing your search on implementation files (`'typescript'`) or documentation (`'markdown'`).

*   **`kind`**: The specific type of a code chunk, based on the language's syntax tree.
    *   **Type:** `'function_declaration'`, `'class_declaration'`, `'import_statement'`, `'interface_declaration'`, etc.
    *   **Example:** When you need to find the main class for the MCP server, you can search for `"MCP Dev Server"` and filter for `kind: 'class_declaration'`.

*   **`imports`**: A list of all modules and files imported by the source file of a code chunk.
    *   **Type:** `string[]`
    *   **Example:** `['@kbn/core/server', 'express', './routes/status']`
    *   **Usage:** This is a powerful tool. If a search result for a function shows that its file `imports` the `express` library, you can infer that it is likely part of the network layer and handles API requests.

*   **`containerPath`**: A breadcrumb-style path showing the containment hierarchy of a symbol.
    *   **Type:** `string`
    *   **Example:** `'McpDevServer > start > setupRoutes'`
    *   **Usage:** This helps you disambiguate functions with common names (e.g., `start`, `setup`) by showing you their parent class or function, providing crucial structural context.

## Your Task: A Chain of Investigation

Your goal is to **implement the new `code_search` tool and register it with the MCP Dev Server using the `addTool` function.**

Here is a recommended "chain of investigation" to follow:

1.  **Understand the MCP Dev Server:** Start by searching for `"MCP Dev Server"`. Look for the `README.md` file in the `kbn-mcp-dev-server` package to understand the server's purpose and architecture.

2.  **Locate the `addTool` function:** Search for `"addTool"` and filter by `kind: 'function_declaration'` to find where this helper function is defined. Read its source code to understand its signature and what arguments it expects. A "tool" is likely an object with a specific schema (e.g., a `name` and an `execute` method).

3.  **Find Examples of Existing Tools:** Search for usages of the `addTool` function to see how other tools are implemented and registered. This will provide a clear pattern to follow for your new `code_search` tool.

4.  **Stub out the `code_search` tool:** Create a new file for your tool. Based on the examples you found, create a new tool object with a `name` property set to `'code_search'` and a placeholder to handle the request. Create a description that explains how the tool works along with use cases that will help the LLM to be most effective with the tool. Mention it should use a "chain of investigation" with the tool.

5.  **Implement method to call the tool:** The method should:
    *   Accept a semantic query string as an argument.
    *   Accpet a KQL filter to allow additional filtering beyond semantic seach for the following fields: type, language, kind, imports, containerPath, filePath, startLine, endLine, created_at, updated_at
    *   Connect to the Elasticsearch server at `http://localhost:9200`.
    *   Execute a search against the `code-chunks` index using the provided query with a `sparce_vector` query and filters created using a function that converts form KQL to Query DSL.
    *   Return the search results in the format expected by the MCP framework.
    *   Create environment varibles to configure the Elasticsearch connection information (username, password, api_key, endpoint, index, inference_id)

6.  **Register the New Tool:** Find the primary entry point for the MCP Dev Server (likely a `start` or `setup` function). Import your new `code_search` tool and call the `addTool` function to register it with the server instance.

By following this chain of investigation, you can efficiently and accurately develop and integrate the new `code_search` tool into the Kibana codebase.

**Begin your task now.**

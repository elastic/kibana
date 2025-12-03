# ToolsService Investigation Report

## Executive Summary

Yes, there **are** tools already registered in the ToolsService! The onechat plugin provides **8 built-in tools** that are automatically registered and available for use with the `naturalLanguageToEsql` function.

---

## Currently Registered Built-in Tools

The ToolsService has 8 platform core tools registered by default in the onechat plugin:

### 1. **search** (`platform_core.search`)
- **Purpose**: Powerful tool for searching and analyzing data within Elasticsearch
- **Capabilities**: Full-text relevance searches and structured analytical queries
- **Use Cases**: 
  - Finding documents by content
  - Counting and aggregating data
  - Summarizing data from indices
- **Parameters**:
  - `query` (string): Natural language query
  - `index` (string, optional): Specific index to search

### 2. **generateEsql** (`platform_core.generate_esql`)
- **Purpose**: Generate ES|QL queries from natural language
- **Capabilities**: Converts natural language to ES|QL syntax
- **Use Cases**:
  - Auto-generating queries based on user intent
  - Query assistance and code generation
- **Parameters**:
  - `query` (string): Natural language query
  - `index` (string, optional): Target index
  - `context` (string, optional): Additional context for generation

### 3. **executeEsql** (`platform_core.execute_esql`)
- **Purpose**: Execute ES|QL queries and return tabular results
- **Important**: Only runs queries, does not write them
- **Use Cases**:
  - Running pre-generated or user-provided ES|QL queries
  - Retrieving query results in tabular format
- **Parameters**:
  - `query` (string): The ES|QL query to execute

### 4. **indexExplorer** (`platform_core.index_explorer`)
- **Purpose**: Discover relevant indices based on natural language
- **Capabilities**: Intelligent index discovery and recommendation
- **Use Cases**:
  - Finding the right index for a query
  - Index discovery based on intent
- **Parameters**:
  - `query` (string): Natural language description
  - `limit` (number, optional): Max indices to return (default: 1)
  - `indexPattern` (string, optional): Filter by pattern (default: *)

### 5. **listIndices** (`platform_core.list_indices`)
- **Purpose**: List indices, aliases, and datastreams from the cluster
- **Use Cases**:
  - Discovering available data sources
  - Filtering indices by pattern
- **Parameters**:
  - `pattern` (string, optional): Index pattern (default: *)

### 6. **getIndexMapping** (`platform_core.get_index_mapping`)
- **Purpose**: Retrieve field mappings for specified indices
- **Use Cases**:
  - Understanding index structure
  - Field discovery and schema inspection
- **Parameters**:
  - `indices` (array of strings): List of indices

### 7. **getDocumentById** (`platform_core.get_document_by_id`)
- **Purpose**: Retrieve full document content by ID
- **Use Cases**:
  - Fetching specific documents
  - Document inspection
- **Parameters**:
  - `id` (string): Document ID
  - `index` (string): Index name

### 8. **createVisualization** (`platform_core.create_visualization`)
- **Purpose**: Create visualizations (Lens charts)
- **Use Cases**:
  - Automated chart generation
  - Data visualization from queries

---

## Tool Architecture

### Registration Flow
```
onechat plugin setup
  → ToolsService.setup()
    → createBuiltinToolRegistry()
      → registerBuiltinTools()
        → Registers all 8 platform core tools
```

### Tool Definition Structure
Each tool has:
- **id**: Unique identifier (e.g., `platform_core.search`)
- **type**: `ToolType.builtin`
- **description**: Clear explanation for LLM usage
- **schema**: Zod schema defining input parameters
- **handler**: Async function that executes the tool logic
- **tags**: Optional categorization

### Tool Schema Format
- Tools use **Zod schemas** internally
- Can be converted to **JSON Schema** for inference plugin compatibility
- Include detailed descriptions for each parameter to guide LLM usage

---

## Integration with naturalLanguageToEsql

### How Tools Enhance ES|QL Generation

When tools are passed to `naturalLanguageToEsql`, the LLM can:

1. **Discover Indices**: Use `indexExplorer` or `listIndices` to find relevant data sources
2. **Inspect Schema**: Use `getIndexMapping` to understand field structures
3. **Generate Better Queries**: Use context from tools to create more accurate ES|QL
4. **Validate Data**: Use `search` or `getDocumentById` to understand data patterns
5. **Iterative Refinement**: Execute queries with `executeEsql` and refine based on results

### Particularly Relevant Tools for SIEM Migrations

For the SIEM migrations use case, these tools are most valuable:

1. **indexExplorer**: Find security-related indices (e.g., `.alerts`, `.logs-*`)
2. **getIndexMapping**: Understand ECS field mappings for accurate translation
3. **generateEsql**: Bootstrap ES|QL generation for complex SPL/AQL queries
4. **executeEsql**: Validate translated queries work correctly
5. **search**: Verify data patterns match expected security use cases

---

## Default Agent Configuration

According to the constants, the default agent comes with these 4 tools enabled:
- `search`
- `listIndices`
- `getIndexMapping`
- `getDocumentById`

These provide a solid foundation for data exploration and query generation.

---

## Performance Considerations

- **Warning Threshold**: 24 active tools (defined in `activeToolsCountWarningThreshold`)
- **Recommendation**: Be selective about which tools to enable
- **Best Practice**: Only enable tools relevant to the specific use case

---

## Custom Tool Registration

While no custom tools are currently registered in the Security Solution plugin, the architecture supports it:

```typescript
// During plugin setup
setup(core: CoreSetup, plugins: PluginSetupDeps) {
  if (plugins.onechat) {
    plugins.onechat.tools.register({
      id: 'security_solution.custom_tool',
      type: ToolType.builtin,
      description: 'Custom security tool',
      schema: z.object({ ... }),
      handler: async (params, context) => { ... }
    });
  }
}
```

---

## Recommendations for SIEM Migrations Integration

### 1. Enable Relevant Tools
Pass a filtered set of tools to `naturalLanguageToEsql`:
- `indexExplorer` - Find security indices
- `getIndexMapping` - Understand ECS schema
- `generateEsql` - Assist with complex translations

### 2. Consider Custom Security Tools
Potentially register SIEM-specific tools:
- `getEcsFieldMapping` - Map vendor fields to ECS
- `validateSecurityQuery` - Check query against security best practices
- `getSiemResources` - Retrieve lookups/macros for context

### 3. Tool Selection Strategy
```typescript
// Only include tools that help with ES|QL generation
const relevantToolIds = [
  platformCoreTools.indexExplorer,
  platformCoreTools.getIndexMapping,
  platformCoreTools.generateEsql,
];

// Filter tools by ID
const filteredTools = allTools.filter(tool => 
  relevantToolIds.includes(tool.id)
);
```

### 4. Monitor Performance
- Start with 3-5 most relevant tools
- Monitor LLM token usage and response quality
- Add more tools only if they demonstrably improve translations

---

## Code Location Reference

- **Tool Registration**: `x-pack/platform/plugins/shared/onechat/server/services/tools/builtin/register_tools.ts`
- **Tool Definitions**: `x-pack/platform/plugins/shared/onechat/server/services/tools/builtin/definitions/`
- **Tool IDs**: `x-pack/platform/packages/shared/onechat/onechat-common/tools/constants.ts`
- **ToolsService**: `x-pack/platform/plugins/shared/onechat/server/services/tools/tools_service.ts`

---

## Conclusion

The ToolsService provides a rich set of 8 built-in tools that can significantly enhance the `naturalLanguageToEsql` function's ability to generate accurate ES|QL queries. For SIEM migrations, integrating these tools (especially `indexExplorer`, `getIndexMapping`, and `generateEsql`) can help the LLM better understand the target Elasticsearch environment and produce more accurate query translations from vendor-specific languages like SPL and AQL.

The integration code provided earlier demonstrates how to retrieve these tools from ToolsService and convert them to the format expected by the inference plugin, enabling a powerful tool-assisted query generation workflow.

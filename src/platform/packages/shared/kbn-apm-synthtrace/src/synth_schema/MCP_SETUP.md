# MCP Synthtrace Tool - Setup and Testing Guide

## Overview

The `synthtrace` MCP tool enables LLMs to generate synthtrace data configurations from natural language prompts. It orchestrates the full flow: schema discovery → config generation → validation → execution.

## Prerequisites

1. **Ensure schema is generated:**
   ```bash
   node scripts/synthtrace.js schema generate
   ```
   This creates `capabilities.json` and `schema.json` in the synth_schema directory.

2. **Ensure examples exist:**
   Check that example files exist in `src/platform/packages/shared/kbn-apm-synthtrace/src/synth_schema/examples/`

## MCP Server Setup

### Option 1: Using Existing MCP Dev Server (Recommended)

The synthtrace tool is already integrated into `@kbn/mcp-dev-server`. To use it:

1. **Start the MCP server:**
   ```bash
   node scripts/mcp_dev.js
   ```

2. **Configure your AI IDE** (e.g., Cursor, Claude Desktop) to connect to the MCP server:
   
   Add to your MCP settings (e.g., `~/.cursor/mcp.json` or Claude Desktop settings):
   ```json
   {
     "mcpServers": {
       "Kibana Dev": {
         "command": "node",
         "args": [
           "/path/to/kibana/scripts/mcp_dev.js"
         ],
         "cwd": "/path/to/kibana"
       }
     }
   }
   ```

3. **Restart your IDE** to connect to the MCP server.

### Option 2: Test Directly (For Development)

Run the test script to simulate an LLM flow:
```bash
node --loader ts-node/esm src/platform/packages/shared/kbn-mcp-dev-server/src/tools/synthtrace.test.ts
```

Or use the built version:
```bash
node dist/src/platform/packages/shared/kbn-mcp-dev-server/src/tools/synthtrace.test.js
```

## Tool Actions

The `synthtrace` tool supports these actions:

### 1. `get_schema`
Get the JSON Schema for the synthtrace DSL.

**Example:**
```json
{
  "action": "get_schema",
  "payload": null
}
```

**Use case:** LLM needs to understand the expected format.

### 2. `get_examples`
Get example schema configurations.

**Example:**
```json
{
  "action": "get_examples",
  "payload": null
}
```

**Use case:** LLM needs reference examples to generate similar configs.

### 3. `generate`
Get instructions for generating a config from a prompt.

**Example:**
```json
{
  "action": "generate",
  "payload": {
    "prompt": "Generate transactions for checkout-service with 20 transactions per minute"
  }
}
```

**Use case:** LLM requests guidance on how to generate a config.

### 4. `validate`
Validate a config object against the schema.

**Example:**
```json
{
  "action": "validate",
  "payload": {
    "config": {
      "timeWindow": { "from": "now-1h", "to": "now" },
      "services": [...]
    }
  }
}
```

**Use case:** LLM validates generated config before applying.

### 5. `estimate`
Estimate event counts without executing.

**Example:**
```json
{
  "action": "estimate",
  "payload": {
    "config": { ... }
  }
}
```

**Use case:** LLM wants to know how many events will be generated.

### 6. `dry_run`
Dry run without executing.

**Example:**
```json
{
  "action": "dry_run",
  "payload": {
    "config": { ... }
  }
}
```

### 7. `apply`
Validate and provide instructions for applying (full execution requires CLI).

**Example:**
```json
{
  "action": "apply",
  "payload": {
    "config": { ... },
    "target": "http://localhost:9200"
  }
}
```

**Note:** For full execution, use the CLI: `node scripts/synthtrace.js schema apply <file> --target <url>`

## Typical LLM Flow

1. **Get Schema**: `synthtrace({ action: "get_schema" })`
   - LLM learns the structure

2. **Get Examples**: `synthtrace({ action: "get_examples" })`
   - LLM sees reference examples

3. **Generate Config**: LLM creates a config object based on user prompt, schema, and examples

4. **Validate**: `synthtrace({ action: "validate", payload: { config } })`
   - LLM validates the generated config

5. **Repair Loop**: If validation fails, LLM fixes errors and re-validates

6. **Estimate**: `synthtrace({ action: "estimate", payload: { config } })`
   - LLM estimates event counts

7. **Apply**: `synthtrace({ action: "apply", payload: { config, target } })`
   - LLM gets instructions or applies via CLI

## Testing as a Naive LLM

To test as if you're a naive LLM (no prior knowledge):

1. **Start MCP server** (see above)

2. **In your AI IDE, use this prompt:**
   ```
   I want to generate synthetic observability data. I need:
   - A service called "checkout-service" 
   - 20 transactions per minute
   - Each transaction should have 3 child spans
   - Also generate CPU and memory metrics
   - Time range: last 1 hour
   
   Help me create the configuration and generate the data.
   ```

3. **The LLM should:**
   - Call `synthtrace({ action: "get_schema" })` to understand format
   - Call `synthtrace({ action: "get_examples" })` for reference
   - Generate a config object matching the schema
   - Call `synthtrace({ action: "validate", payload: { config } })` to validate
   - Fix any validation errors
   - Call `synthtrace({ action: "estimate", payload: { config } })` to see event count
   - Provide instructions or apply the config

## Troubleshooting

### MCP Server Not Starting
- Ensure Node.js version is compatible
- Check that `@kbn/mcp-dev-server` is built: `yarn build --scope @kbn/mcp-dev-server`

### Schema Not Found
- Run `node scripts/synthtrace.js schema generate` first

### Tool Not Available
- Verify the tool is registered in `src/platform/packages/shared/kbn-mcp-dev-server/src/server/index.ts`
- Restart the MCP server

### Validation Errors
- Check the error messages - they point to specific field paths
- Review the schema and examples for correct format
- Ensure all required fields are present

## Next Steps

- [ ] Add LLM integration for automatic config generation from prompts
- [ ] Support full `apply` execution within MCP (currently requires CLI)
- [ ] Add progress reporting for long-running applies
- [ ] Add support for more complex behaviors (piecewise, conditions)
- [ ] Add support for cross-signal correlations


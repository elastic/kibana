# ✅ E2E Testing Status - Synthtrace MCP Tool

## Current Status: READY FOR TESTING

All components are implemented and ready for end-to-end testing.

## ✅ What's Implemented

### 1. Core Schema System
- ✅ **Dynamic Capability Discovery**: Automatically discovers all signals, entities, enums, and correlation keys from synthtrace codebase
- ✅ **Zod-First DSL**: Type-safe schema with runtime validation
- ✅ **JSON Schema Export**: LLM-friendly schema generated from Zod
- ✅ **Comprehensive Validation**: Friendly error messages with field paths

### 2. MCP Tool (`synthtrace`)
- ✅ **Tool Implementation**: `src/platform/packages/shared/kbn-mcp-dev-server/src/tools/synthtrace.ts`
- ✅ **Server Registration**: Added to `src/platform/packages/shared/kbn-mcp-dev-server/src/server/index.ts`
- ✅ **7 Actions Supported**:
  1. `get_schema` - Returns JSON Schema for LLM grounding
  2. `get_examples` - Returns example configurations
  3. `generate` - Provides instructions for prompt-based generation
  4. `validate` - Validates config against schema (Zod-based)
  5. `estimate` - Estimates event counts without executing
  6. `dry_run` - Dry run mode
  7. `apply` - Validates and provides CLI instructions

### 3. Discovery Results
- ✅ **5 Signals**: traces, metrics, logs, hosts, synthetics
- ✅ **21 Agent Names**: All discovered from scenarios
- ✅ **6 Span Types**: app, custom, db, external, messaging, storage
- ✅ **17 Span Subtypes**: elasticsearch, http, sql, redis, kafka, etc.
- ✅ **13 Correlation Keys**: trace.id, transaction.id, span.id, service.name, host.name, agent.id, etc.

## 📋 What You Need to Do (External Steps)

### Step 1: Build the Packages
```bash
# Build MCP dev server and synthtrace packages
yarn build --scope @kbn/mcp-dev-server
yarn build --scope @kbn/apm-synthtrace
```

### Step 2: Generate Schema (One-time)
```bash
# This creates capabilities.json and schema.json
node scripts/synthtrace.js schema generate
```

**Verify it worked:**
```bash
node scripts/test_synthtrace_mcp.js
```

### Step 3: Start MCP Server
```bash
# Start the MCP server (it will listen on stdio)
node scripts/mcp_dev.js
```

The server will start and wait for MCP protocol messages from your IDE.

### Step 4: Configure Your AI IDE

#### For Cursor IDE:
1. Open Cursor Settings → Features → Model Context Protocol
2. Add server configuration:
```json
{
  "mcpServers": {
    "Kibana Dev": {
      "command": "node",
      "args": ["/absolute/path/to/kibana/scripts/mcp_dev.js"],
      "cwd": "/absolute/path/to/kibana"
    }
  }
}
```
3. Restart Cursor

#### For Claude Desktop:
1. Edit config file:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

2. Add:
```json
{
  "mcpServers": {
    "kibana-dev": {
      "command": "node",
      "args": ["/absolute/path/to/kibana/scripts/mcp_dev.js"]
    }
  }
}
```

3. Restart Claude Desktop

### Step 5: Test as Naive LLM

Once your IDE is connected to the MCP server, use this prompt:

```
I need to generate synthetic observability data. Please help me create a configuration for:

- Service name: "checkout-service"
- Environment: "production"  
- Agent: "nodejs"
- Generate 20 transactions per minute
- Each transaction should have 3 child spans:
  1. "Validate Order" (app type, 50ms)
  2. "Process Payment" (external type, 300ms)
  3. "Update Inventory" (db type, 100ms)
- Also generate CPU and memory metrics
- Time range: last 1 hour

Please:
1. Get the schema to understand the format
2. Look at examples for reference
3. Generate the configuration
4. Validate it
5. Estimate how many events will be created
6. Tell me how to apply it
```

## 🔄 Expected LLM Interaction Flow

When you test, the LLM should:

1. **Discovery**:
   ```
   synthtrace({ action: "get_schema" })
   → Gets JSON Schema (385 lines)
   
   synthtrace({ action: "get_examples" })
   → Gets 4 example files
   
   synthtrace({ action: "generate", payload: { prompt: "..." } })
   → Gets capabilities and instructions
   ```

2. **Generation**:
   - LLM creates config object based on schema + examples + prompt
   - Config matches the Zod schema structure

3. **Validation**:
   ```
   synthtrace({ action: "validate", payload: { config } })
   → Returns: { valid: true } or { valid: false, errors: [...] }
   ```

4. **Repair Loop** (if needed):
   - LLM fixes validation errors
   - Re-validates until passing

5. **Estimation**:
   ```
   synthtrace({ action: "estimate", payload: { config } })
   → Returns: { estimatedEvents: 867, ... }
   ```

6. **Application**:
   ```
   synthtrace({ action: "apply", payload: { config, target: "http://localhost:9200" } })
   → Executes directly - generates and indexes data to Elasticsearch
   → Returns: { success: true, message: "Schema executed successfully", ... }
   ```

## 🧪 Manual Testing (Without IDE)

You can test the tool programmatically:

```bash
# After building, you can test individual actions
node -e "
const tool = require('./dist/src/platform/packages/shared/kbn-mcp-dev-server/src/tools/synthtrace');
tool.synthtraceTool.handler({ action: 'get_schema' })
  .then(r => console.log('Schema retrieved:', r.content[0].text.length, 'chars'))
  .catch(e => console.error('Error:', e.message));
"
```

## 📊 Verification Checklist

Run this to verify everything is ready:

```bash
node scripts/test_synthtrace_mcp.js
```

Expected output:
- ✅ MCP tool file exists
- ✅ Tool is registered in MCP server
- ✅ Schema file exists
- ✅ Capabilities file exists
- ✅ Signals: traces, metrics, logs, hosts, synthetics
- ✅ Correlation keys: 13

## 🎯 Success Criteria

The E2E test is successful if:

1. ✅ LLM can retrieve schema via `get_schema`
2. ✅ LLM can retrieve examples via `get_examples`
3. ✅ LLM can generate a valid config from a natural language prompt
4. ✅ LLM can validate the config and receive helpful error messages
5. ✅ LLM can estimate event counts
6. ✅ LLM can apply the config directly via `apply` action - data is indexed to Elasticsearch (no files created)
7. ✅ LLM can generate a tabular summary report via `report` action showing services, instances, configs, and estimated events

## 📝 Example Generated Config (Expected)

When you test with the prompt above, the LLM should generate something like:

```json
{
  "timeWindow": {
    "from": "now-1h",
    "to": "now"
  },
  "services": [
    {
      "id": "checkout-service",
      "name": "checkout-service",
      "environment": "production",
      "agentName": "nodejs",
      "instances": [
        {
          "id": "instance-1",
          "traces": [
            {
              "name": "POST /api/checkout",
              "count": 20,
              "spans": [
                { "name": "Validate Order", "type": "app", "durationMs": 50 },
                { "name": "Process Payment", "type": "external", "durationMs": 300 },
                { "name": "Update Inventory", "type": "db", "durationMs": 100 }
              ]
            }
          ],
          "metrics": [
            {
              "metrics": {
                "system.cpu.total.norm.pct": 0.65,
                "system.memory.actual.free": 750
              }
            }
          ]
        }
      ]
    }
  ]
}
```

## 🚀 You're Ready!

Everything is in place. Follow the steps above to:
1. Build the packages
2. Generate schema (if not done)
3. Start MCP server
4. Configure your IDE
5. Test with a natural language prompt

The tool will guide the LLM through the entire flow from prompt → config → validation → execution.


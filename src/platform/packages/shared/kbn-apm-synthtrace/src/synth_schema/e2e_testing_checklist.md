# E2E Testing Checklist - Synthtrace MCP Tool

## ✅ What's Already Implemented

### 1. Core Infrastructure
- ✅ **Capability Discovery**: Dynamically discovers all signals, entities, enums, and correlation keys
- ✅ **Zod DSL Schema**: Type-safe schema definition with validation
- ✅ **JSON Schema Generation**: LLM-friendly schema exported from Zod
- ✅ **Validation**: Runtime validation with friendly error messages
- ✅ **Executor**: Executes schemas to generate data (traces, spans, metrics)

### 2. MCP Tool Implementation
- ✅ **Tool Created**: `src/platform/packages/shared/kbn-mcp-dev-server/src/tools/synthtrace.ts`
- ✅ **Tool Registered**: Added to MCP server in `src/server/index.ts`
- ✅ **Actions Supported**:
  - `get_schema` - Returns JSON Schema
  - `get_examples` - Returns example configs
  - `generate` - Provides instructions for prompt-based generation
  - `validate` - Validates config against schema
  - `estimate` - Estimates event counts
  - `dry_run` - Dry run mode
  - `apply` - Validates and provides CLI instructions

### 3. Test Infrastructure
- ✅ **Test Script**: `synthtrace.test.ts` simulates LLM flow
- ✅ **Documentation**: `MCP_SETUP.md` with setup instructions

## 🔧 What You Need to Do Externally

### Step 1: Build the Codebase
```bash
# Build the MCP dev server and synthtrace packages
yarn build --scope @kbn/mcp-dev-server
yarn build --scope @kbn/apm-synthtrace
```

### Step 2: Generate Schema (Required Before Testing)
```bash
# Generate capabilities.json and schema.json
node scripts/synthtrace.js schema generate
```

This creates:
- `src/platform/packages/shared/kbn-apm-synthtrace/src/synth_schema/capabilities.json`
- `src/platform/packages/shared/kbn-apm-synthtrace/src/synth_schema/schema.json`

### Step 3: Start MCP Server

**Option A: Direct Node execution**
```bash
node scripts/mcp_dev.js
```

**Option B: Via yarn**
```bash
yarn mcp:dev
```

The server will start and listen on stdio for MCP protocol messages.

### Step 4: Configure Your AI IDE

#### For Cursor IDE:
1. Open Cursor settings
2. Find MCP server configuration
3. Add:
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

#### For Claude Desktop:
1. Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)
2. Add similar MCP server configuration

#### For Gemini CLI:
See `src/platform/packages/shared/kbn-mcp-dev-server/README.md` for Gemini-specific setup.

### Step 5: Test the Tool

#### Manual Test (Simulating LLM):
```bash
# Build first if needed
yarn build

# Run test script
node dist/src/platform/packages/shared/kbn-mcp-dev-server/src/tools/synthtrace.test.js
```

#### Via AI IDE:
Once MCP server is connected, use this prompt:

```
I need to generate synthetic observability data. Create a configuration for:
- Service: "checkout-service" 
- Environment: "production"
- Agent: "nodejs"
- 20 transactions per minute
- Each transaction should have 3 child spans (Validate Order, Process Payment, Update Inventory)
- Also generate CPU and memory metrics
- Time range: last 1 hour

Generate the configuration, validate it, estimate how many events will be created, and tell me how to apply it.
```

## 📋 Expected LLM Flow

When you test as a naive LLM, the tool should handle this flow:

1. **Discovery Phase:**
   - LLM calls `synthtrace({ action: "get_schema" })` → Gets JSON Schema
   - LLM calls `synthtrace({ action: "get_examples" })` → Gets example configs
   - LLM calls `synthtrace({ action: "generate", payload: { prompt: "..." } })` → Gets capabilities info

2. **Generation Phase:**
   - LLM generates a config object based on schema + examples + prompt
   - LLM calls `synthtrace({ action: "validate", payload: { config } })` → Validates

3. **Repair Loop (if validation fails):**
   - LLM fixes errors based on validation feedback
   - Re-validates until it passes

4. **Estimation Phase:**
   - LLM calls `synthtrace({ action: "estimate", payload: { config } })` → Gets event count

5. **Application Phase:**
   - LLM calls `synthtrace({ action: "apply", payload: { config, target } })` → Gets instructions
   - LLM (or user) executes via CLI: `node scripts/synthtrace.js schema apply <file> --target <url>`

## 🧪 Verification Checklist

Before testing, verify:

- [ ] Schema generated: `ls src/platform/packages/shared/kbn-apm-synthtrace/src/synth_schema/schema.json`
- [ ] Capabilities exist: `ls src/platform/packages/shared/kbn-apm-synthtrace/src/synth_schema/capabilities.json`
- [ ] Examples exist: `ls src/platform/packages/shared/kbn-apm-synthtrace/src/synth_schema/examples/*.json`
- [ ] MCP server builds: `yarn build --scope @kbn/mcp-dev-server`
- [ ] Tool is registered: Check `src/platform/packages/shared/kbn-mcp-dev-server/src/server/index.ts` includes `synthtraceTool`
- [ ] MCP server starts: `node scripts/mcp_dev.js` (should start without errors)

## 🐛 Troubleshooting

### "Schema not found" error
- Run: `node scripts/synthtrace.js schema generate`

### "Module not found" errors
- Build packages: `yarn build --scope @kbn/mcp-dev-server --scope @kbn/apm-synthtrace`

### MCP server won't start
- Check Node.js version compatibility
- Ensure all dependencies are installed: `yarn install`
- Check for TypeScript errors: `yarn typecheck`

### Tool not available in IDE
- Verify MCP server is running
- Check MCP server configuration in IDE
- Restart IDE after configuration changes
- Check MCP server logs for errors

### Validation always fails
- Check that config matches schema structure
- Use `get_examples` to see working examples
- Review error messages - they show exact field paths

## 📊 Current Capabilities

The system can discover:
- **5 Signals**: traces, metrics, logs, hosts, synthetics
- **21 Agent Names**: All common agents (java, nodejs, go, python, etc.)
- **6 Span Types**: app, custom, db, external, messaging, storage
- **17 Span Subtypes**: elasticsearch, http, sql, redis, kafka, etc.
- **13 Correlation Keys**: trace.id, transaction.id, span.id, service.name, host.name, etc.

## 🚀 Next Enhancements

- [ ] Full `apply` execution within MCP (currently requires CLI)
- [ ] LLM-native config generation (currently returns instructions)
- [ ] Progress reporting for long-running operations
- [ ] Support for piecewise functions and conditions
- [ ] Cross-signal correlation helpers


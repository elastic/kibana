# Kibana Dev MCP Server - Available Tools

The "Kibana Dev" MCP server exposes **6 tools** for development workflows:

## 1. `list_kibana_packages`
**Description**: List Kibana packages and Kibana application plugins

**Input**: None (empty object)

**Use Case**: Discover available packages and plugins in the Kibana codebase

---

## 2. `generate_kibana_package`
**Description**: Generate a Kibana package

**Input**:
- `name` (string): The name of the package. Must start with `@kbn/` and contain no spaces
- `owner` (string): The owning Github team of the package. Use `list_kibana_teams` to find appropriate owner
- `group` (enum): One of `'chat'`, `'search'`, `'observability'`, `'security'`, `'platform'`

**Use Case**: Scaffold a new Kibana package with proper structure

---

## 3. `list_kibana_teams`
**Description**: List Kibana Github teams

**Input**: None (empty object)

**Use Case**: Find available team names for package ownership

---

## 4. `run_unit_tests`
**Description**: Run unit tests for changed files

**Input**: None (empty object)

**Use Case**: Automatically run Jest tests for files that have been modified or added

**Behavior**: 
- Detects changed files from git (modified + untracked)
- Groups files by package (finds nearest `jest.config.js`)
- Runs tests for each affected package
- Returns results with pass/fail status

---

## 5. `run_ci_checks`
**Description**: Run CI checks similar to the Buildkite pipeline

**Input**:
- `checks` (array, optional): Specific checks to run. Defaults to all:
  - `'build'`: Build Kibana Distribution
  - `'quick_checks'`: Quick validation checks
  - `'checks'`: Additional checks
  - `'type_check'`: TypeScript type checking
  - `'linting_with_types'`: ESLint with type checking
  - `'linting'`: All linting checks (ESLint and Stylelint)
  - `'oas_snapshot'`: OpenAPI documentation validation
- `parallel` (boolean, optional): Whether to run checks in parallel. Defaults to `true`

**Use Case**: Run CI checks locally before pushing, similar to what Buildkite runs

---

## 6. `synthtrace` ⭐
**Description**: Orchestrates synthtrace schema operations for generating synthetic observability data

**Input**:
- `action` (enum): One of:
  - `'get_schema'`: Get the JSON Schema for synthtrace DSL
  - `'get_examples'`: Get example schema configurations
  - `'generate'`: Generate a config from a natural language prompt (returns instructions)
  - `'validate'`: Validate a config object against the schema
  - `'apply'`: Execute a config directly - generates and indexes data to Elasticsearch
  - `'estimate'`: Estimate event counts without executing
  - `'dry_run'`: Dry run without executing
  - `'report'`: Generate a tabular summary report of the configuration
- `payload` (object, optional): Action-specific payload:
  - `prompt` (string, optional): Natural language prompt for generating config
  - `config` (object, optional): Schema configuration object to validate/apply
  - `target` (string, optional): Elasticsearch target URL (default: `http://localhost:9200`)
  - `kibana` (string, optional): Kibana target URL
  - `apiKey` (string, optional): API key for authentication
  - `from` (string, optional): Override time window from
  - `to` (string, optional): Override time window to
  - `concurrency` (number, optional): Bulk indexing concurrency
  - `insecure` (boolean, optional): Skip SSL certificate validation

**Use Case**: Generate complex, realistic synthetic observability data (traces, logs, metrics, hosts, synthetics) using natural language prompts or declarative JSON schemas

**Example Flow**:
1. `get_schema` → Get JSON Schema to understand format
2. `get_examples` → See example configurations
3. Create JSON config based on requirements
4. `validate` → Validate the config
5. `estimate` → See how many events will be created
6. `apply` → Execute and index data to Elasticsearch
7. `report` → Get tabular summary of the configuration

**Features**:
- ✅ Supports time-varying behaviors (piecewise distributions, linear growth, etc.)
- ✅ Supports all signal types: traces, logs, metrics, hosts, synthetics
- ✅ Dynamic capability discovery from synthtrace codebase
- ✅ Automatic correlation key linking across signals
- ✅ Validates with Zod before execution
- ✅ Direct execution (no intermediate files)

---

## Test Results

I ran an E2E test simulating an LLM flow through the `synthtrace` tool:

✅ **Schema retrieved**: JSON Schema successfully loaded  
✅ **Examples retrieved**: 4 example files found  
✅ **Config generated**: Created a test config with:
   - 1 service (checkout-service, nodejs agent)
   - 1 instance
   - 1 trace config with piecewise errorRate (0% → 20% → 0%)
   - 3 spans (Validate Order, Process Payment, Update Inventory)
   - 1 metric config with piecewise CPU behavior
✅ **Config validated**: Zod validation passed  
✅ **Events estimated**: ~2,460 events for 30-minute window  
✅ **Report generated**: Tabular summary created successfully  

---

## Next Steps

To test the full flow with actual data generation:

1. Ensure Elasticsearch is running at `http://localhost:9200`
2. Uncomment the `apply` section in the test script
3. Run the test again to see data being indexed

The tool is ready for LLM integration! 🚀


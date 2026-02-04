# Developer & Agent Instructions

## Context: File Locations & Paths

- **Tools Source:** `@x-pack/solutions/observability/plugins/observability_agent_builder/server/tools/`
- **Tests:** `@x-pack/solutions/observability/test/api_integration_deployment_agnostic/apis/observability_agent_builder/tools/`
- **Synthtrace Scenarios:** `@src/platform/packages/shared/kbn-synthtrace/src/scenarios/agent_builder/tools/`

## How to Validate Tools

### Prerequisites

- **Kibana** must be running at: `http://localhost:5601`
- **Elasticsearch** must be running at: `http://localhost:9200`
- **Credentials:** `elastic:changeme`

### 1. Running a Synthtrace Scenario

To generate synthetic data using Synthtrace:

```bash
node scripts/synthtrace src/platform/packages/shared/kbn-synthtrace/src/scenarios/agent_builder/tools/<tool_name>/<scenario> \
  --from "now-1h" \
  --to "now" \
  --clean
```

### 2. Running the Tool via API

To execute a tool via the Kibana API, use the following `curl` command.
**Note:** Replace `<tool_name>` with the a valid tool name

```bash
curl -X POST http://localhost:5601/api/agent_builder/tools/_execute \
  -u elastic:changeme \
  -H 'kbn-xsrf: true' \
  -H 'Content-Type: application/json' \
  -d '{
        "tool_id": "observability.<tool_name>",
        "tool_params": { }
      }'
```

You must specify the required `tool_params` for the selected tool.

## How to Validate an AI Insight

### 1. Running a Synthtrace Scenario

To generate synthetic data using Synthtrace:

```bash
node scripts/synthtrace src/platform/packages/shared/kbn-synthtrace/src/scenarios/agent_builder/ai_insights/<scenario> \
  --from "now-1h" \
  --to "now" \
  --clean
```

### 2. Call the AI Insight

```bash
curl -X POST http://localhost:5601/internal/observability_agent_builder/ai_insights/alert \
  -u elastic:changeme \
  -H 'kbn-xsrf: true' \
  -H 'Content-Type: application/json' \
  -d '{
        "alert_id": "my_alert_id"
      }'
```

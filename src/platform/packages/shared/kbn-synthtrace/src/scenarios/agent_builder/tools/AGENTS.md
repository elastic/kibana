# Synthtrace Scenarios for Observability Agent Builder Tools

This directory contains synthetic data generation scenarios for testing **Observability Agent Builder tools**. The Observability Agent helps Site Reliability Engineers (SREs) investigate incidents by analyzing Observability data (logs, metrics, traces) to reduce Mean Time To Resolution (MTTR).

---

## Overview

Each scenario generates realistic test data that exercises a specific Observability tool. Scenarios are **dual-use**:

1. **CLI use** — Run standalone to populate a local Elasticsearch/Kibana for manual testing
2. **API test use** — Import the generator function in automated API tests

---

## Related Locations

| Component                 | Path                                                                                                              |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Tools implementation**  | `x-pack/solutions/observability/plugins/observability_agent_builder/server/tools/`                                |
| **API integration tests** | `x-pack/solutions/observability/test/api_integration_deployment_agnostic/apis/observability_agent_builder/tools/` |

---

## Scenario Pattern

Every scenario **MUST** follow this dual-use pattern:

### 1. Export a Generator Function

The generator function can be imported and used in API tests:

```typescript
export function generateMyToolData({
  logsEsClient,        // or apmEsClient, infraEsClient
  range,               // Timerange (optional, has default)
}: {
  logsEsClient: LogsSynthtraceEsClient;
  range?: Timerange;
}): ScenarioReturnType<T> {
  const effectiveRange = range ?? timerange('now-1h', 'now');

  const data = effectiveRange.interval('1m').rate(1).generator((timestamp) => {
    // Generate documents...
    return [log.create()...];
  });

  return withClient(logsEsClient, data);
}
```

### 2. Export a Default CLI Scenario

Use `createCliScenario` for simple scenarios:

```typescript
export default createCliScenario(({ range, clients: { logsEsClient } }) =>
  generateMyToolData({ logsEsClient, range })
);
```

For scenarios needing lifecycle hooks (bootstrap/teardown), use manual `Scenario`:

```typescript
const scenario: Scenario<LogDocument> = async () => ({
  bootstrap: async ({ logsEsClient }) => {
    // Setup (e.g., create index templates)
  },
  generate: ({ range, clients: { logsEsClient } }) => generateMyToolData({ logsEsClient, range }),
  teardown: async (clients, kibanaClient, esClient) => {
    // Cleanup or post-generation setup (e.g., create ML jobs)
  },
});

export default scenario;
```

---

## CLI Usage

Run a scenario to populate local Elasticsearch with test data:

```bash
node scripts/synthtrace \
  src/platform/packages/shared/kbn-synthtrace/src/scenarios/agent_builder/tools/<tool_name>/<scenario>.ts \
  --from "now-1h" --to "now" --clean --workers=1
```

After running, test the tool via Kibana API:

```bash
curl -X POST http://localhost:5601/api/agent_builder/tools/_execute \
  -u elastic:changeme \
  -H 'kbn-xsrf: true' \
  -H 'Content-Type: application/json' \
  -d '{
    "tool_id": "observability.<tool_name>",
    "tool_params": { "start": "now-1h", "end": "now" }
  }'
```

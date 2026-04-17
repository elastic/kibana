# Context Gathering for Rules, Notification Policies & Workflows

Everything needed to build accurate alerting v2 rules, notification policies, and workflows for the Astronomy Shop cluster — and how that context was obtained.

## 1. Cluster connectivity

**What was needed**: Elasticsearch host, credentials, Kibana port, remote cluster name.

**How it was obtained**: Read `config/kibana.dev.yml` which contained:
- ES host: `https://edge-rca-ccs-acjyc-slack.es.us-west2.gcp.elastic-cloud.com:443`
- Credentials: `admin / C3D2MxOz2CnpUS4C8xleVlad`
- Kibana: `http://localhost:5605`

The remote cluster alias (`remote_cluster`) was provided by the user and confirmed via API queries.

## 2. Index inventory

**What was needed**: Complete list of indices on the remote cluster, categorized by type (OTel custom data vs Elastic-shipped).

**How it was obtained**:
- Queried `_resolve/index/remote_cluster:*` via the Elasticsearch API
- Ran `_cat/indices/remote_cluster:*` to get document counts and sizes
- Paginated through results to ensure no indices were missed

**Key finding**: The remote cluster had dozens of indices, but only a subset contained custom OTel data from the Astronomy Shop. The rest were Elastic-shipped (synthetics, profiling, Elastic Agent). Per user instructions, only custom OTel indices were targeted.

**Relevant OTel indices**:
- `remote_cluster:traces-generic.otel-default` — distributed traces
- `remote_cluster:metrics-kubeletstatsreceiver.otel-default` — container/pod metrics from kubelet
- `remote_cluster:metrics-k8sclusterreceiver.otel-default` — Kubernetes cluster metrics
- `remote_cluster:logs-generic.otel-default` — application logs

## 3. Field name discovery

**What was needed**: Actual field names in each index — OTel data can be mapped to ECS differently depending on the collector configuration.

**How it was obtained**: ES|QL sampling queries against each index.

### Traces (`traces-generic.otel-default`)

Ran queries to discover:
- **Service names**: `STATS c = COUNT(*) BY service.name` — confirmed ECS-mapped `service.name` (not `resource.attributes.service.name`)
- **Error field**: `STATS c = COUNT(*) BY event.outcome` — confirmed `event.outcome` with values `Success` and (implicitly) `failure`
- **Duration field**: `STATS p50 = PERCENTILE(span.duration.us, 50)` — confirmed `span.duration.us` in microseconds
- **Available attributes**: Sampled `peer.service`, `db.system`, `http.response.status_code`, `messaging.system`, `rpc.method` for signal rules

**Key correction**: Initial plan assumed `resource.attributes.service.name` and `status.code` — actual fields were `service.name` and `event.outcome` due to ECS mapping. Duration was `span.duration.us` (microseconds), not `duration` (nanoseconds).

### Metrics (`metrics-kubeletstatsreceiver.otel-default`)

Ran queries to discover:
- **CPU metric**: `k8s.container.cpu_request_utilization` (not `container.cpu.utilization`)
- **Available pod/container fields**: `k8s.pod.name`, `k8s.container.name`, `k8s.namespace.name`

### Metrics (`metrics-k8sclusterreceiver.otel-default`)

Ran queries to discover:
- **Restart metric**: `k8s.container.restarts` (not `k8s.pod.restart_count`)
- **Pod/container identification fields**: Same `k8s.pod.name`, `k8s.container.name`

## 4. Threshold calibration

**What was needed**: Baseline values for error rates, latencies, and resource usage to set meaningful thresholds.

**How it was obtained**: ES|QL aggregation queries.

### Error rates
```
FROM remote_cluster:traces-generic.otel-default
| STATS total = COUNT(*), errors = COUNT(CASE(event.outcome == "failure", 1, NULL))
  BY service.name
```
Showed which services had non-zero error rates and their magnitudes. Thresholds were set above observed baseline to avoid noisy alerts.

### Latency percentiles
```
FROM remote_cluster:traces-generic.otel-default
| STATS p50 = PERCENTILE(span.duration.us, 50),
        p95 = PERCENTILE(span.duration.us, 95),
        p99 = PERCENTILE(span.duration.us, 99)
  BY service.name
```
Revealed that most services had P95 < 500ms, but some had spikes due to Chaos Mesh experiments. Thresholds were set at 1s (general) and 2s (checkout) to distinguish real degradation from normal variance.

### Resource usage
```
FROM remote_cluster:metrics-kubeletstatsreceiver.otel-default
| WHERE k8s.namespace.name == "default"
| STATS avg_cpu = AVG(k8s.container.cpu_request_utilization) BY k8s.pod.name
```
Showed typical CPU utilization patterns. Threshold set at 80% with conservative state transitions (3 consecutive checks).

## 5. Alerting v2 API schema

**What was needed**: Exact JSON structure for creating rules, notification policies, and workflows.

**How it was obtained**: Read the Zod schemas in the codebase:
- `x-pack/platform/packages/shared/response-ops/alerting-v2-schemas/src/rule_data_schema.ts` — rule structure (kind, metadata, time_field, schedule, evaluation.query.base, recovery_policy, state_transition, grouping, no_data, artifacts)
- `x-pack/platform/packages/shared/response-ops/alerting-v2-schemas/src/notification_policy_data_schema.ts` — notification policy structure (name, description, destinations, matcher, groupBy, groupingMode, throttle)
- `x-pack/platform/plugins/shared/workflows_management/server/api/routes/workflows/create_workflow.ts` — workflow creation (id format must be `workflow-{uuid}`, body requires `id` and `yaml` fields)

## 6. Notification policy matcher context

**What was needed**: Which fields are available in the KQL matcher for notification policies.

**How it was obtained**: Read the dispatcher's `evaluate_matchers_step.ts` which builds the `MatcherContext`:
```typescript
{
  last_event_timestamp, group_hash, episode_id, episode_status,
  data: { ... },
  rule: { id, name, description, tags, enabled, createdAt, updatedAt }
}
```
This revealed that tags are nested under `rule.tags`, not top-level — so the matcher needed to be `rule.tags: "astronomy-shop"` (not just `tags: "astronomy-shop"`).

## 7. Connector discovery

**What was needed**: ID and type of the existing Slack connector.

**How it was obtained**: Queried `GET /api/actions/connectors` via the Kibana API. Found one Slack connector with ID `slack` and type `.slack`.

## 8. Workflow input schema

**What was needed**: The payload structure that the dispatcher sends to workflows, so the YAML template could reference the correct fields via Liquid templates (e.g., `{{ inputs.episodes[0].rule_name }}`).

**How it was obtained**: The user provided an example workflow YAML that documented the initial `NotificationPolicyWorkflowPayload` schema. This was confirmed and extended by reading `dispatch_step.ts` which constructs the payload.

**Original payload** (before enrichment):
```typescript
{
  id: string;                  // notification group ID
  policyId: string;            // notification policy ID
  groupKey: Record<string, unknown>;
  episodes: Array<{
    last_event_timestamp: string;
    rule_id: string;
    group_hash: string;
    episode_id: string;
    episode_status: 'inactive' | 'pending' | 'active' | 'recovering';
  }>;
}
```

**Final payload** (after enrichment work in this demo):
```typescript
{
  id: string;                  // notification group ID
  policyId: string;            // notification policy ID
  policyName: string;          // human-readable policy name
  policyUrl?: string;          // deep link to policy edit page
  groupingMode: 'per_episode' | 'all' | 'per_field';
  workflowName: string;        // human-readable workflow name
  workflowUrl?: string;        // deep link to workflow
  groupKey: Record<string, unknown>;
  episodes: Array<{
    last_event_timestamp: string;
    rule_id: string;
    rule_name?: string;        // human-readable rule name (from saved object)
    rule_url?: string;         // deep link to rule detail page
    group_hash: string;
    group_values?: Record<string, unknown>;  // e.g. {"service.name": "cart"}
    episode_id: string;
    episode_status: 'inactive' | 'pending' | 'active' | 'recovering';
    episode_url?: string;      // deep link to episode detail page
    data?: Record<string, unknown>;  // raw episode data from alert events
  }>;
}
```

**Key insight**: The payload shape is not documented anywhere — it is implicitly defined by what `dispatch_step.ts` passes to `scheduleWorkflow()`. Every field we added required tracing through the dispatcher pipeline to find the data source, then modifying `types.ts`, `dispatch_step.ts`, and sometimes upstream steps like `fetch_rules_step.ts`.

## 9. Notification policy creation

**What was needed**: How to create a notification policy via API, which fields are required, and how grouping modes map to UI labels.

**How it was obtained**:
- Read the Zod schema in `notification_policy_data_schema.ts` for the full field set: `name`, `description`, `destinations` (array of `{type: "workflow", id}` objects), `matcher` (KQL string), `groupBy`, `groupingMode`, `throttle`
- Read `alerting-v2-constants/index.ts` to get the API base path for notification policies
- Read the UI constants in `notification_policy/form/constants.ts` to understand the grouping mode mapping: `per_episode` = "Per episode" (default), `all` = "Digest", `per_field` = "Per field"

**Issues encountered**:
- **Grouping mode naming confusion**: The user asked for a "digest" policy. The API field is `groupingMode: "all"`, not a literal string `"digest"`. Had to read the UI form constants to discover this mapping.
- **Throttle configuration for digest**: A digest policy pairs `groupingMode: "all"` with a `time_interval` throttle (e.g., `{ type: "time_interval", interval: "5m" }`), not `on_status_change`. This wasn't obvious from the schema alone — the schema accepts any combination, but only certain pairings make sense.

**What would have helped**: A brief description in the schema or a comment mapping UI labels to API enum values. A table of recommended groupingMode + throttle pairings.

## 10. Workflow payload schema discovery

**What was needed**: The exact structure of the payload dispatched to workflows, so the YAML template could reference the correct Liquid template variables.

**How it was obtained**: Read `dispatch_step.ts` to trace how the `NotificationPolicyWorkflowPayload` is constructed. Initially the payload was minimal (`id`, `policyId`, `groupKey`, `episodes[]`). Over the course of the demo, the payload was progressively enriched.

**Issues encountered**:
- **Missing `rule_name`**: Slack messages showed "Rule: ``" because the payload only included `rule_id`, not the human-readable name. Had to trace from `dispatch_step.ts` → `types.ts` → `fetch_rules_step.ts` to understand that rule metadata was available in the pipeline state but not passed through to the workflow payload. Fixed by adding `rule_name` to `AlertEpisode`.
- **Missing `episode_url` / `rule_url`**: No deep links were available. Had to discover the public UI paths by reading `alerting_v2/public/constants.ts`, then inject `server.publicBaseUrl` via Inversify (`KibanaBaseUrlToken`).
- **Missing `group_values`**: The raw `episode.data` was a nested object (created by `parseDataJson` using `lodash.set`), but the rule's `groupingFields` were flat dotted strings like `"service.name"`. Had to use `lodash.get` to traverse the nested structure correctly.
- **Empty `group_values` on recovery**: Alert events for `recovering`/`inactive` episodes are emitted with `data: {}`. The ES|QL `LAST(data_json, @timestamp)` picked the most recent (empty) event, losing the data from earlier active events. Fixed by filtering empty data to NULL in the query EVAL.
- **Missing workflow/policy metadata**: The payload had `policyId` but not `policyName`, `policyUrl`, `workflowName`, or `workflowUrl`. Each required tracing through the dispatcher to find where the data was available and threading it through to the payload.

**What was hardest**: The `group_values` data flow was the trickiest to trace. The data undergoes three transformations before reaching the workflow, and each uses a different convention:
1. The rule engine writes `data: {"service.name": "cart"}` — flat dotted keys
2. ES|QL extracts this as `JSON_EXTRACT(_source, "$.data")` → a raw JSON string `'{"service.name":"cart"}'`
3. `parseDataJson` in `fetch_episodes_step.ts` calls `lodash.set(result, key.split('.'), value)` which turns the flat key into a nested object: `{ service: { name: "cart" } }`
4. `extractGroupValues` in `dispatch_step.ts` calls `lodash.get(episode.data, field)` where `field` is `"service.name"` from `rule.groupingFields` — lodash interprets the dot as a path separator, which happens to match the nested structure from step 3

The fact that `set` with `split('.')` and `get` with a dotted string are compatible is coincidental. Nothing documents that the data passes through this transformation. If `parseDataJson` used a different approach (e.g., preserved flat keys), `extractGroupValues` would silently return `undefined` with no error. This required reading three files simultaneously to understand.

**What would have helped**: A single, well-documented `NotificationPolicyWorkflowPayload` interface with JSDoc describing each field and its source. Currently the payload shape is implicit — you have to read `dispatch_step.ts` to understand what workflows receive. A "workflow payload reference" doc would save significant time. For the data transformation chain specifically, a comment in `parseDataJson` explaining that downstream consumers use `lodash.get` with dotted paths would prevent confusion.

## 11. Workflow step type discovery

**What was needed**: Complete list of available step types for workflow YAML, their parameters, and output schemas.

**How it was obtained**:
- Read `kbn-workflows/spec/builtin_step_definitions.ts` for built-in steps: `console`, `if`, `foreach`, `while`, `switch`, `data.set`, `elasticsearch.search`, `elasticsearch.index`, `http`, etc.
- Read `kbn-workflows/spec/schema.ts` for the workflow YAML schema
- Read `kbn-workflows/spec/elasticsearch/overrides/` for ES step parameter details (e.g., `elasticsearch.index` accepts `index`, `id`, `document`, `refresh`)
- Connector step types are dynamically generated as `{connectorType}.{subAction}` — discovered by reading `get_connectors_tool.ts`

**Issues encountered**:
- **No `expression` step type**: Tried to use a hypothetical `expression` step to compute alert status counts. Had to discover it doesn't exist and switch to inline Liquid filters (`inputs.episodes | where: 'episode_status', 'active' | size`).
- **`elasticsearch.index` `refresh` parameter**: Adding `refresh: true` (boolean) caused validation failure. Had to read the override schema to discover it expects `refresh: "true"` (string).
- **`elasticsearch.search` `term` query on text fields**: A `term` query on `episode_id` (dynamically mapped as `text`) silently returned 0 results because the UUID was tokenized on hyphens. Had to recreate the index with explicit `keyword` mapping.
- **Connector step discovery**: Step types like `slack2.sendMessage` are not listed anywhere centrally — they're derived from connector type + sub-action. Had to read the connector schema code to understand the naming convention.

**What was hardest**: The workflow YAML execution model has several syntax conventions that are not documented together and had to be learned through trial-and-error:
- **Conditionals use `${{ }}` not `{{ }}`**: Liquid templates use `{{ }}` for value interpolation, but `if:` conditions on steps use `${{ }}` with a different expression evaluator. Using the wrong syntax silently evaluates to truthy/falsy in unexpected ways.
- **`data.set` populates `variables.*`**: The `data.set` step writes to a `variables` namespace. Later steps access these as `{{ variables.statusEmoji }}`. This naming isn't obvious — you might expect `data.*` or `state.*`.
- **`steps.{name}.output` captures connector responses**: After a `slack2.sendMessage` step named `post_episode`, the Slack API response is at `steps.post_episode.output.ts`. The `output` key and the fact that it contains the full connector response (not just success/failure) had to be discovered by reading step execution data.
- **`switch` / `cases` / `default` structure**: Each case contains a nested `steps` array, not a single step. The `default` key is a flat array, not inside a `match` object. These structural differences from typical switch/case syntax caused validation errors until the exact shape was found in `builtin_step_definitions.ts`.
- **Connector step naming convention**: The `.slack_api` connector type becomes `slack2` in workflow step types — not `slack_api` or `slackApi`. This mapping (`slack2`) is defined in `get_connectors_tool.ts` and is completely non-obvious. Combined with the sub-action name, you get `slack2.sendMessage`, `slack2.updateMessage`, etc.

**What would have helped**: A single reference page listing all available step types with their parameters and output shapes. A workflow YAML authoring guide covering the expression syntax (`${{ }}` vs `{{ }}`), variable scoping (`variables.*`, `steps.*.output`, `inputs.*`), and the connector-to-step-type naming convention. For connector steps, a generated catalog showing each connector's available sub-actions and their parameter schemas.

## 12. Workflow API for iterative development

**What was needed**: How to fetch, update, and debug workflows via API during iterative development.

**How it was obtained**:
- `GET /api/workflows/workflow/{id}` — fetch current definition
- `PUT /api/workflows/workflow/{id}` with `{"definition": "<yaml-string>"}` — update definition
- `GET /api/workflows/workflow/{id}/executions` — list recent executions
- `GET /api/workflows/executions/{executionId}/logs` — detailed step-by-step logs
- `GET /api/workflows/workflow/{id}/executions/steps?stepId={name}&includeInput=true&includeOutput=true` — step input/output data across executions
- Read `update_workflow.ts` and `get_execution_logs.ts` for route definitions

**Issues encountered**:
- **Workflow definition format**: The `PUT` endpoint expects `definition` as a raw YAML string, JSON-escaped. Building this correctly required `jq -Rs '.'` on the YAML content.
- **Execution step API**: The `/executions/steps` endpoint was invaluable for debugging (seeing exactly what ES query was sent, what Slack received), but it wasn't documented — had to discover it by reading route files.

**What would have helped**: API reference docs for workflow CRUD and execution debugging endpoints. A note about the YAML string encoding requirement.

## 13. Dispatcher pipeline understanding

**What was needed**: How the dispatcher processes episodes from rule events into workflow dispatches.

**How it was obtained**: Read each step file in `alerting_v2/server/lib/dispatcher/steps/` and the pipeline orchestrator in `execution_pipeline.ts`.

**The full pipeline** (each step can halt the pipeline):
```
fetch_episodes → fetch_suppressions → apply_suppression → fetch_rules →
fetch_policies → evaluate_matchers → build_groups → apply_throttling →
dispatch → store_actions
```

**Key files read**:
- `steps/index.ts` — step ordering and exports
- `execution_pipeline.ts` — pipeline orchestrator, halt/continue logic, debug logging
- `steps/fetch_episodes_step.ts` — ES|QL query with `LOOKBACK_WINDOW_MINUTES` (10 min) time filter
- `constants.ts` — `LOOKBACK_WINDOW_MINUTES = 10`
- `queries.ts` — the complex ES|QL query joining `.rule-events` and `.alert-actions`
- `steps/evaluate_matchers_step.ts` — KQL matcher context construction
- `steps/dispatch_step.ts` — workflow invocation with API key and fake request
- `steps/store_actions_step.ts` — writes fire/suppress/notified/unmatched records to `.alert-actions`
- `task_runner.ts` — task manager integration, `previousStartedAt` state management
- `ui_settings.ts` — `observability:alerting:dispatcherEnabled` toggle

**Issues encountered**:
- **Circular data dependency**: The dispatcher query joins `.rule-events` and `.alert-actions` — it uses past actions (fire/suppress/unmatched) to determine which episodes are new. Understanding this required reading both `queries.ts` and `store_actions_step.ts` together.
- **Action type semantics**: The distinction between `fire` (dispatched to a policy), `notified` (workflow invoked), `suppress` (throttled or acknowledged), and `unmatched` (no matching policy) was not documented. Each has different implications for future dispatcher cycles.
- **API key requirement**: `dispatch_step.ts` (lines 61-69) checks for `policy.apiKey` and silently skips dispatch if missing. Everything upstream still works — episodes are matched, groups are built, the pipeline reaches the dispatch step — but the workflow is never invoked. The only signal is a WARN-level log. This is a critical hidden requirement.
- **`LOOKBACK_WINDOW_MINUTES`**: The dispatcher's time filter is `previousStartedAt - 10 minutes`. Without finding this constant in `constants.ts`, the `gte` value in the Lucene filter appeared arbitrary.

**What was hardest**: Understanding the relationship between the dispatcher pipeline's shared state and what ultimately reaches a workflow. Each step reads from `DispatcherPipelineState` and writes back to it via `DispatcherStepOutput`. The state accumulates: `fetch_episodes` adds `episodes`, `fetch_rules` adds `rules`, `evaluate_matchers` adds `matched`, `build_groups` adds `groups`, and `dispatch` reads from all of them. But the `dispatch` step only selects a subset to build the `NotificationPolicyWorkflowPayload`. There's no schema or interface that says "these are the fields available at dispatch time" — you have to mentally replay the pipeline to know what's in `state.rules`, `state.policies`, etc. when `dispatch` runs.

The other genuinely confusing aspect was the circular data dependency in the ES|QL query. The dispatcher writes `.alert-actions` records (fire/suppress/notified) that the *same query* reads on the next cycle to determine which episodes are new. This means a single bug in `store_actions_step.ts` can cause the dispatcher to either re-fire everything every cycle or never fire anything. Understanding this loop required reading `queries.ts` (the INLINE STATS that join against `.alert-actions`) and `store_actions_step.ts` (what gets written) simultaneously.

**What would have helped**: A comment or doc in `execution_pipeline.ts` listing the steps, their halt conditions, and the data flow between them. A clear note about the API key requirement at the notification policy creation level. A diagram or comment in `queries.ts` explaining the `.rule-events` / `.alert-actions` feedback loop.

## 14. Workflow execution verification

**What was needed**: Confirming whether the workflow actually ran and whether the Slack steps succeeded.

**How it was obtained**: Queried the workflow execution indices directly against Elasticsearch:
- `.workflows-executions` — 10 executions, all `status: "completed"`
- `.workflows-step-executions` — 60 step executions, Slack steps returning `output.text: "ok"`
- `.workflows-execution-data-stream-logs` — 143 detailed log entries

These index names were not documented — discovered by running `_cat/indices/.workflows*` against the cluster.

**What would have helped**: A `GET /api/workflows/workflow/{id}/health` endpoint or similar that surfaces recent execution status without needing to query internal indices directly.

## 15. Context that could only come from reading source code

The rule creation side of alerting v2 was relatively self-documenting — the Zod schemas describe the API shape, and ES|QL queries against live data provided field names and baselines. But the notification and workflow pipeline had almost no documentation layer. Nearly everything required reading implementation code.

| What was needed | Files read | Why no other source existed |
|---|---|---|
| Workflow payload shape | `dispatch_step.ts`, `types.ts` | Payload is constructed inline, no schema file or docs |
| Matcher context fields | `evaluate_matchers_step.ts` | KQL matcher operates on an undocumented context object |
| `data` transformation chain | `queries.ts`, `fetch_episodes_step.ts`, `dispatch_step.ts` | Three-stage transform (ES|QL → `lodash.set` → `lodash.get`) with no comments |
| Available workflow step types | `builtin_step_definitions.ts`, `schema.ts`, ES overrides | No generated catalog or reference page |
| Connector-to-step-type naming | `get_connectors_tool.ts` | `.slack_api` → `slack2` mapping is implicit |
| Workflow YAML syntax (`${{ }}` vs `{{ }}`) | `schema.ts`, trial-and-error | No authoring guide |
| `variables.*` scoping from `data.set` | `builtin_step_definitions.ts` | Namespace convention not documented |
| `steps.*.output` response capture | Execution step API + source | Had to query execution data to see output shape |
| `elasticsearch.index` `refresh` type | `elasticsearch/overrides/elasticsearch.index.ts` | Schema says `string`, not `boolean` — no docs |
| Dispatcher pipeline flow | ~10 files in `dispatcher/steps/` | No architecture doc or comment |
| Dispatcher feedback loop | `queries.ts` + `store_actions_step.ts` | Circular dependency between `.rule-events` and `.alert-actions` |
| API key silent failure | `dispatch_step.ts` lines 61-69 | Only discoverable by reading the dispatch step |
| Public UI route paths | `alerting_v2/public/constants.ts` | No API to resolve deep links |
| `KibanaBaseUrlToken` injection | `bind_services.ts` | Inversify token pattern specific to this plugin |
| Grouping mode UI-to-API mapping | `notification_policy/form/constants.ts` | "Digest" = `"all"`, only in UI form code |
| Workflow execution debugging endpoints | `get_execution_logs.ts`, route files | Not documented in any API reference |

The pattern is clear: rules can be authored from schemas + data, but notification policies and workflows require reading the dispatcher and workflow engine source code.

## Summary

The most impactful context-gathering steps were:

1. **Field name discovery** — without sampling, the rules would have used wrong field names (e.g., `resource.attributes.service.name` instead of `service.name`) and silently returned zero results
2. **Threshold calibration** — without baselines, thresholds would be arbitrary and either too noisy or too quiet
3. **Matcher context** — without reading the `evaluate_matchers_step.ts` source, the notification policy matcher would have used `tags` instead of `rule.tags` and never matched
4. **Index inventory** — ensured rules targeted only the correct custom OTel data, not Elastic-shipped indices
5. **Dispatch payload tracing** — the workflow payload shape is implicit in `dispatch_step.ts`; every missing field required reading multiple source files to understand where the data originates and how to thread it through
6. **Step type discovery** — no central reference for available workflow steps, their parameters, or output schemas; had to read multiple spec files and connector schemas
7. **Dispatcher pipeline tracing** — understanding the 10-step pipeline, its data flow, halt conditions, and the circular dependency between `.rule-events` and `.alert-actions` required reading ~10 source files

## Gaps that would most improve the agent experience

| Gap | Impact | Suggested fix |
|-----|--------|--------------|
| Matcher context fields not discoverable | Had to read `evaluate_matchers_step.ts` to learn that tags are `rule.tags`, not top-level `tags` | Add a `GET .../matcher_fields` API or document the context shape in the notification policy API docs |
| API key requirement is silent | Dispatch step skips with only a WARN log; everything else looks successful. A policy can appear fully configured but never dispatch | Surface missing API key as a validation error on policy creation, or show it in the policy status response |
| No workflow payload reference doc | Every payload field required source-code tracing across 3-5 files. Workflow YAML authors have no way to know what `{{ inputs.* }}` variables are available | Auto-generate or manually maintain a `NotificationPolicyWorkflowPayload` reference with field descriptions and sources |
| Grouping mode naming mismatch between UI and API | "Digest" in UI = `groupingMode: "all"` in API; no mapping documented anywhere | Add a comment or enum description in the Zod schema, or include UI labels in the API response |
| Valid groupingMode + throttle pairings undocumented | Schema accepts any combination, but only certain pairings are meaningful (e.g., digest needs `time_interval`, not `on_status_change`) | Document recommended pairings or add schema-level validation |
| No step type catalog | Trial-and-error to discover available steps and valid parameters; connector steps are dynamically generated with no central listing | Generate a step type reference from `builtin_step_definitions.ts` + connector schemas |
| Workflow execution debugging APIs undocumented | Discovered `/executions/steps?stepId=...&includeInput=true` by reading route code; invaluable for debugging but invisible | Add to workflow API docs |
| Workflow execution indices undocumented | Had to `_cat/indices/.workflows*` to find execution/step data | Document the internal indices or provide a health/status API |
| Dispatcher pipeline not documented | 10-step pipeline with halt conditions and circular data dependencies; had to read ~10 source files to understand the flow from rule event to workflow invocation | Add an architecture comment or doc listing steps, halt reasons, and data flow |
| Dispatcher observability at INFO level is zero | Runs every 5s with no output unless DEBUG is enabled; logger name (`plugins.alertingVTwo`) had to be discovered in source code | Add INFO log per cycle summarizing episodes found, matched, dispatched, suppressed |
| ES|QL `data_json` loses data on recovery | Recovering/inactive events have `data: {}`, silently drops group context needed for notifications | Either persist last-known data at the rule engine level or document this as a known limitation |
| Rule `kind` behavior differences not documented | `alert` rules manage full episode lifecycle; `signal` rules generate data without episodes. Choosing the wrong kind produces no errors but rules silently don't behave as expected | Document when to use each kind and what features (recovery, state transitions, grouping) are available for each |
| `time_field` required but not validated at creation | A rule can be created with the wrong `time_field` and silently evaluate against zero data. No error until you check evaluation history | Validate that the time_field exists in the target index at creation time, or surface a warning |
| `no_data` configuration interaction with cross-cluster indices | When the remote cluster is unreachable, `no_data` rules fire indistinguishably from "genuinely no data" scenarios | Consider surfacing cluster connectivity errors separately from no-data conditions |

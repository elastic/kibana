# Alerting v2 Demo Summary

End-to-end demonstration of the Kibana Alerting v2 system using the OpenTelemetry "Astronomy Shop" demo application running on GKE, with data accessible via a remote Elastic Cloud cluster.

## What was built

### 16 alerting v2 rules

All rules target custom OTel data from the Astronomy Shop via CCS (`remote_cluster:` prefix). Elastic-shipped indices (synthetics, profiling, Elastic Agent logs) were excluded.

**Alert rules (9)** — full episode lifecycle with state transitions:

| Rule | Index | Detection logic |
|------|-------|----------------|
| Frontend error spike | `traces-generic.otel-default` | `event.outcome == "failure"` count > 200 for the frontend service |
| Checkout service errors | `traces-generic.otel-default` | `event.outcome == "failure"` count > 30 for checkout |
| Checkout E2E latency | `traces-generic.otel-default` | P95 `span.duration.us` > 2s for checkout |
| Service latency (P95) | `traces-generic.otel-default` | P95 `span.duration.us` > 1s across all services |
| Cart service error rate | `traces-generic.otel-default` | Error ratio > 20% for the cart service |
| Product catalog errors | `traces-generic.otel-default` | `event.outcome == "failure"` count > 30 for product-catalog |
| Recommendation errors | `traces-generic.otel-default` | `event.outcome == "failure"` count > 30 for recommendation |
| Container CPU utilization | `metrics-kubeletstatsreceiver.otel-default` | Avg `k8s.container.cpu_request_utilization` > 0.8 per pod/container |
| Container restarts | `metrics-k8sclusterreceiver.otel-default` | `k8s.container.restarts` > 3 per pod/container |

**Signal rules (7)** — data emission without episode management:

| Rule | Index | What it captures |
|------|-------|-----------------|
| Load generator activity | `traces-generic.otel-default` | Request count from the load-generator service |
| Service dependency map | `traces-generic.otel-default` | Call counts grouped by `service.name` and `peer.service` |
| Database operation volume | `traces-generic.otel-default` | Operation counts grouped by `service.name` and `db.system` |
| HTTP status code distribution | `traces-generic.otel-default` | Request counts by service and `http.response.status_code` |
| Messaging throughput | `traces-generic.otel-default` | Message counts grouped by `service.name` and `messaging.system` |
| Error breakdown by service | `traces-generic.otel-default` | Error counts by `service.name` and `event.outcome` |
| gRPC method performance | `traces-generic.otel-default` | P50/P95/P99 latency + call count by `rpc.method` |

All rules were tagged with `astronomy-shop` for unified notification policy matching.

### Slack notification pipeline

Created the full notification chain:

```
Notification Policy → Workflow (YAML) → Slack API Connector → Slack channel
```

**Notification Policy** (`0a63b022-669e-43e6-8a0f-51cbba4bbc06`):
- Name: "Astronomy Shop: All alerts to Slack"
- Matcher: `rule.tags: "astronomy-shop"` (covers all 16 rules)
- Grouping: `per_episode` (one notification per state change)
- Throttle: `on_status_change` (only fires on episode transitions)

A second **digest policy** was also created with `groupingMode: "all"` and a time-interval throttle.

**Workflow** (`workflow-38f318da-e98d-4a5c-94f7-7baaa3113162`):
- Name: "Astronomy Shop Slack Alerts"
- Uses the `.slack2` connector (`slack-api`) via the `ConnectorSpec` system (`kbn-connector-specs`)
- Status-specific formatting via `switch` step: red circle (active), green circle (recovered), yellow circle (pending/recovering)
- Per-episode threading with top-level message updates (see below)
- Slack date formatting using `<!date^EPOCH^{date_short_pretty} at {time}|fallback>` for native timezone-aware rendering
- Messages include hyperlinked rule name, episode ID, workflow name, and policy name pointing to their respective Kibana detail pages
- Group values displayed as JSON labels (e.g., `{"service.name":"cart"}`)

### Dispatcher payload enrichment

Enriched the `NotificationPolicyWorkflowPayload` and `AlertEpisode` types so workflows receive rich metadata:

| Field | Source | Purpose |
|-------|--------|---------|
| `rule_name` | Rule saved object `metadata.name` | Human-readable rule name |
| `rule_url` | `server.publicBaseUrl` + rule path | Deep link to rule detail page |
| `episode_url` | `server.publicBaseUrl` + episode path | Deep link to episode detail page |
| `group_values` | `episode.data` + `rule.groupingFields` | Key-value pairs for display |
| `policyName` | Policy saved object `name` | Human-readable policy name |
| `policyUrl` | `server.publicBaseUrl` + policy edit path | Deep link to policy |
| `workflowName` | Workflow `name` | Human-readable workflow name |
| `workflowUrl` | `server.publicBaseUrl` + workflow path | Deep link to workflow |
| `groupingMode` | Policy `groupingMode` | `per_episode`, `all`, or `per_field` |

Key implementation details:
- `KibanaBaseUrlToken` injected via Inversify from `http.basePath.publicBaseUrl`
- `extractGroupValues` uses `lodash.get` to traverse nested data objects created by `parseDataJson` (which converts flat ES|QL keys like `service.name` into nested objects via `lodash.set`)
- `groupingFields` extracted from rule saved objects in `FetchRulesStep`

### Episode-level Slack threading with status updates

Implemented per-episode message threading where the top-level message always reflects the current state, and the thread underneath builds a timeline of every status change.

**First dispatch (new episode):**
1. Posts a top-level message with "Current status:", rule, group, episode link, "Started:" timestamp, and workflow/policy links
2. Immediately threads a point-in-time status reply (e.g., ":red_circle: ACTIVE | Today at 3:42 PM")
3. Stores `thread_ts` and all static message fields in Elasticsearch (`alerting-v2-slack-threads` index)

**Subsequent dispatches (same episode):**
1. Retrieves stored `thread_ts` and static fields from Elasticsearch
2. Updates the original top-level message — only the "Current status:" line changes; rule, group, links, and start time are preserved from the stored data
3. Posts a new threaded reply with the point-in-time status

**Static field persistence:**
On first post, these fields are stored in the ES doc alongside `thread_ts`:
- `started_at`, `rule_name`, `rule_url`, `group_values` (as JSON string), `episode_url`
- `workflow_name`, `workflow_url`, `policy_name`, `policy_url`

On updates, the message is rebuilt from these stored values. This prevents data loss when later events (e.g., recovering/inactive) arrive with empty `data` payloads.

**ES index setup:**
- Index: `alerting-v2-slack-threads`
- Explicit `keyword` mapping on `episode_id`, `thread_ts`, and `channel` (required because Elasticsearch's default dynamic mapping creates `text` fields, which tokenize UUIDs and break `term` queries)

### `slack2.updateMessage` connector action

Added a new `updateMessage` action to the `.slack2` Slack connector (ConnectorSpec system) to support editing existing messages via Slack's `chat.update` API. This enables the workflow to update the original top-level message with the latest episode status without replacing or losing the original context.

**Important distinction:** The user's `slack-api` connector is type `.slack2`, which belongs to the `kbn-connector-specs` system — not the older `.slack_api` type in the `stack_connectors` system. These are two separate Slack connector implementations. The `updateMessage` action was added to the correct one.

File modified:
- `src/platform/packages/shared/kbn-connector-specs/src/specs/slack/slack.ts` — added `updateMessage` action with input schema (`channel`, `ts`, `text`) and handler calling `chat.update`

### Slack date formatting

All timestamps in Slack messages use Slack's native date token syntax for timezone-aware rendering:

```
<!date^UNIX_EPOCH^{date_short_pretty} at {time}|ISO_FALLBACK>
```

This renders as "Today at 10:40 AM" or "Apr 8, 2026 at 3:42 PM" in the viewer's local timezone. The Liquid `| date: '%s'` filter converts ISO timestamps from the payload to Unix epoch seconds for the date token.

Applied to:
- Top-level message "Started:" timestamp
- Thread reply point-in-time timestamps

## Bug fixes

### 1. Dispatcher `_index LIKE` on multi-data-stream ES|QL queries

While debugging why no Slack notifications were being sent, discovered that the dispatcher's `fetch_episodes` query was returning 0 rows despite `.rule-events` containing hundreds of alert events.

**Root cause**: ES|QL's `LIKE` operator does not work correctly on the `_index` metadata field when querying across multiple data streams. The dispatcher query `FROM ".rule-events", ".alert-actions" METADATA _index` uses `_index LIKE ".ds-.rule-events-*"` throughout to distinguish which data stream a document came from. This silently matched zero documents.

**Proof**:
```
FROM ".rule-events", ".alert-actions" METADATA _index
| WHERE _index LIKE ".ds-.rule-events-*"     → 0 rows

FROM ".rule-events", ".alert-actions" METADATA _index
| WHERE TO_STRING(_index) LIKE ".ds-.rule-events-*"  → 874 rows
```

**Fix**: Changed all 8 occurrences of `_index LIKE` to `TO_STRING(_index) LIKE` in `queries.ts`. All 28 existing unit tests pass.

**Impact**: Without this fix, the dispatcher pipeline halted at the first step (`fetch_episodes`) every cycle. No episodes were ever dispatched, no notifications were ever sent, and no action records were written to `.alert-actions`.

### 2. Empty `group_values` on recovering/inactive episodes

Episodes transitioning to `recovering` or `inactive` status emit alert events with `data: {}`. The ES|QL query used `LAST(data_json, @timestamp)` which always picked the most recent event — losing the grouping data that was present in earlier `active`/`pending` events.

**Fix**: Added a filter in the EVAL step to treat empty data (`{}`) as NULL, so `LAST(data_json, @timestamp)` skips empty events and picks the last event that contained actual grouping data.

### 3. Workflow update API field name mismatch

The `PUT /api/workflows/workflow/{id}` endpoint expects the workflow YAML content in the `yaml` field of the JSON body, not `definition`. The `UpdateWorkflowCommandSchema` (in `kbn-workflows/types/v1.ts`) enforces this. Using `definition` silently accepted the request (`valid: true`) but did not persist the workflow changes.

### 4. `updateMessage` implemented in wrong connector system

The `updateMessage` action was initially added to the `stack_connectors` Slack API connector (`.slack_api` type). However, the user's `slack-api` connector was actually type `.slack2`, which is part of the newer `kbn-connector-specs` system. The workflow engine validated step types against `ConnectorSpec` definitions, so `slack2.updateMessage` was rejected as "Invalid connector type."

**Fix**: Moved the `updateMessage` implementation to `kbn-connector-specs/src/specs/slack/slack.ts`, the correct source for the `.slack2` connector.

### Agentic Analysis — Slack-triggered AI investigations

Added an opt-in "Agentic Analysis" feature that allows users to trigger AI-powered alert investigations directly from Slack by reacting with the `:mag:` emoji.

#### Architecture

```
Admin enables in UI → API key created & stored as Encrypted Saved Object
                                    ↓
Slack :mag: reaction → Webhook reads stored API key → Fake request crafted
                                    ↓
Episode lookup (scoped ES client) → Agent Builder (Observability Agent) → Results posted to Slack thread
```

#### Settings page

New "Settings" management app registered under "V2 Alerting Preview" (order 4). Contains a global "Agentic Analysis" toggle:

- **Enabling**: Creates an API key via `grantAsInternalUser` under the admin's identity, stores it encrypted in an ESO (`alerting_agentic_analysis_settings` type). The API key inherits the admin's privileges for ES queries and Agent Builder access.
- **Disabling**: Marks the existing API key for invalidation, clears the stored credential.
- **GET `/api/alerting/v2/settings`**: Returns all settings including `agenticAnalysis: { enabled, owner, createdAt, updatedAt }`. Generic endpoint designed for future settings.
- **POST `/api/alerting/v2/settings/agentic-analysis`**: Enables or disables the feature with `{ enabled: boolean }`.

#### Encrypted Saved Object

New SO type `alerting_agentic_analysis_settings`:
- `enabled` (boolean) — whether the feature is active
- `auth.apiKey` (binary, **encrypted**) — base64-encoded API key
- `auth.owner` (keyword, **AAD**) — Kibana username who enabled the feature
- `auth.createdByUser` (boolean, **AAD**)
- `createdAt`, `updatedAt` (date)
- Namespace type: `agnostic` (global singleton, not space-scoped)
- Singleton document ID: `agentic-analysis-global`

#### Slack webhook (`POST /api/alerting/v2/slack/events`)

Unauthenticated endpoint (Slack signing secret verification instead of Kibana auth). On `:mag:` reaction:

1. Reads the agentic analysis ESO via `getDecryptedAsInternalUser`
2. If not enabled, posts a warning to the thread
3. Crafts a fake `KibanaRequest` with the stored API key (`kibanaRequestFactory`)
4. Creates a scoped ES client from the fake request to look up the episode in `alerting-v2-slack-threads`
5. Posts an immediate "Starting investigation..." message with the rule name and group values
6. Calls `agentBuilder.execution.executeAgent` with the Observability Agent and a structured investigation prompt
7. Listens for the `conversation_created` event (post-persistence) to post a "Follow along in Kibana" link to the thread
8. When the agent completes, posts the full investigation results with a "Continue this conversation in Kibana" link

The investigation prompt instructs the agent to analyze traces for errors/latency, check logs for anomalies, review metrics for resource issues, and identify correlated changes.

#### Slack thread message sequence

```
1. ⏳ Starting investigation...
   Rule: *Checkout service errors*  |  service.name: checkout
   The Observability Agent is analyzing this alert. This may take a minute.
   Once complete, you'll receive the analysis and a link to continue the conversation.

2. 💬 Follow along in Kibana                    ← posted when conversation is persisted

3. 🔎 Investigation Results                     ← posted when agent finishes
   [full analysis text]
   💬 Continue this conversation in Kibana
   🔗 View episode
```

#### Connector resolution fix

Agent Builder was attempting to use a non-existent "gemini" connector from a stale `genAiSettings:defaultAIConnector` UI setting. Fixed by adding a `uiSettings.overrides` in `kibana.dev.yml`:

```yaml
uiSettings.overrides:
  'genAiSettings:defaultAIConnector': 'NO_DEFAULT_CONNECTOR'
```

This forces Agent Builder to auto-detect an available connector from the fallback chain (inference default → recommended → preferred → first available).

#### Files created/modified

**New files:**
- `server/saved_objects/agentic_analysis_settings_mappings.ts` — ES mapping definition
- `server/saved_objects/schemas/agentic_analysis_settings_attributes/v1.ts` + `index.ts` — model version schema
- `server/saved_objects/model_versions/agentic_analysis_settings_model_versions.ts` — model version registration
- `server/routes/settings/get_settings_route.ts` — generic GET settings endpoint
- `server/routes/settings/update_agentic_analysis_route.ts` — POST enable/disable with API key management
- `server/routes/settings/agentic_analysis_constants.ts` — type constant and singleton ID
- `server/routes/settings/agentic_analysis_tokens.ts` — Inversify DI token for the SO client
- `public/application/mount_settings.tsx` — isolated mount for the settings app (separate webpack chunk)
- `public/pages/settings/agentic_analysis_settings_page.tsx` — React page with EUI toggle, status callout, save button

**Modified files:**
- `server/saved_objects/index.ts` — registered new SO type + ESO encryption
- `server/saved_objects/model_versions/index.ts` — exported new model versions
- `server/setup/bind_services.ts` — bound `AgenticAnalysisSavedObjectsClientToken`, added type to ESO client
- `server/setup/bind_routes.ts` — registered settings routes, removed `SlackInvestigateRoute`
- `server/routes/slack_events_route.ts` — full rewrite: reads stored API key, crafts fake request, runs investigation server-side
- `server/config.ts` — removed unused `connectorId` from slackEvents schema
- `server/lib/slack_events/tokens.ts` — removed `connectorId` from `SlackEventsConfig` interface
- `public/constants.ts` — added `ALERTING_V2_SETTINGS_APP_ID`
- `public/index.ts` — registered settings management app

**Removed files:**
- `server/routes/slack_investigate_route.ts` — browser-authenticated investigation route (replaced by server-side webhook flow)

**Cleanup (outside alerting_v2):**
- `agent_builder/server/utils/resolve_selected_connector_id.ts` — removed debug `console.log` statements

## Verification

After all fixes, confirmed end-to-end flow:

1. `.rule-events` — rules producing alert events with episode state (active, pending, recovering, inactive)
2. `.alert-actions` — dispatcher writing fire/notified/suppress records, referencing the notification policy
3. `.workflows-executions` — workflow executions completing successfully
4. `.workflows-step-executions` — Slack steps returning `output.text: "ok"`, ES index/search steps for threading
5. Slack channel — messages with hyperlinked metadata, per-episode threading, status updates on original messages, and Slack-native date formatting
6. `alerting-v2-slack-threads` — thread_ts + static field persistence with keyword mappings for exact-match queries
7. Thread timeline — each episode builds a chronological thread: PENDING → ACTIVE → RECOVERING → RECOVERED, with the top-level message always reflecting the current state
8. Agentic analysis — `:mag:` reaction triggers Observability Agent investigation, posts results to thread with Kibana conversation link

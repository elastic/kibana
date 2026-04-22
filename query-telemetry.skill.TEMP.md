---
name: query-telemetry
description: >-
  Queries Elastic stack telemetry (Response Ops / Kibana usage) with ES|QL (POST /_query).
  Covers stack-telemetry.elastic.dev, response-ops data view, six-month lookback, fleet
  rollups (VALUES/MV_MAX vs INLINESTATS), mapping-backed field families (rules, connectors,
  cases, reporting, taskManager), and Kibana collector provenance for interpreting counts.
  Use when investigating connector/rule/cases adoption, execution health, or incidents with API key access.
---

# Query telemetry (Elastic Observability)

## Goal

Turn vague questions into **bounded, time-scoped** queries, then report **evidence** (counts, shape, samples)—not guesses. Separate **what the data shows** from **what it might mean**, and name gaps (retention, sampling, missing fields, collector errors).

---

## Stack-telemetry (Response Ops snapshots)

| Item | Value |
|------|--------|
| Kibana UI | [https://stack-telemetry.elastic.dev/](https://stack-telemetry.elastic.dev/) |
| Space | **`response-ops`** — API path prefix **`/s/response-ops/`** |
| ES\|QL index / data view | **`response-ops`** (title = `FROM` target) |
| Primary time field | Prefer **`timestamp`** for snapshot rows. The backing index also defines **`@timestamp`**; if a query returns empty, verify which field is populated for that backing index generation. |
| Grain | Many rows per **`cluster_uuid`** over time; fleet questions usually need **latest row per cluster** in a lookback window |

**Default lookback:** **`timestamp > now() - 6 months`** (also `now() - 6months`, `now() - 180 days`). Captures clusters that **stopped reporting**. Shorten the window only when the question is explicitly recent-only.

---

## Where the numbers come from (Kibana codebase)

Response Ops telemetry in the cluster is **downstream of Kibana usage collection** plus **remote indexing/normalization** (field names like `rules.all.total` are not always identical to raw collector keys). Use the code to interpret **semantics**, **cadence**, and **failure modes**.

### Usage collectors (registered types)

| Telemetry area | Usage collector `type` | Main implementation | Notes |
|----------------|------------------------|----------------------|--------|
| Alerting rules & executions | **`alerts`** | `x-pack/platform/plugins/shared/alerting/server/usage/alerting_usage_collector.ts` | `fetch` reads **Task Manager** saved task **`Alerting-alerting_telemetry`** state (see `usage/task.ts`: `TASK_ID`, `TELEMETRY_TASK_TYPE`). |
| Connectors / actions | **`actions`** | `x-pack/platform/plugins/shared/actions/server/usage/actions_usage_collector.ts` | Task **`Actions-actions_telemetry`** (`actions/server/usage/task.ts`). |
| Cases | **`cases`** | `x-pack/platform/plugins/shared/cases/server/telemetry/index.ts` | Task materializes a **saved object**; the collector `fetch` returns **`{}`** if the SO is missing (task not run yet)—**distinct from “all zeros”** when the collector comment in `collect_telemetry_data.ts` applies. |

**Shape in code (alerting):** `x-pack/platform/plugins/shared/alerting/server/usage/types.ts` (`AlertingUsage`) — e.g. `count_total`, `count_active_total`, `count_by_type`, `count_rules_executions_*`, `percentile_num_*`, gap/backfill counters, etc.

**Shape in code (actions):** `x-pack/platform/plugins/shared/actions/server/usage/types.ts` (`ActionsUsage`) — e.g. `count_total`, `count_by_type`, `count_gen_ai_provider_types`, execution and outcome breakdowns.

**How snapshots are assembled locally:** `src/platform/plugins/shared/telemetry/server/telemetry_collection/get_local_stats.ts` merges cluster stats + `stack_stats.kibana` from usage collectors before shipment.

When debugging “wrong totals,” check **`has_errors` / `error_messages`** on the relevant subtree if present in the index, and remember **daily** metrics are fed by **event-log / task-manager backed tasks** (see `alerting/server/usage/task.ts` imports such as `get_telemetry_from_event_log`, `get_telemetry_from_task_manager`).

---

## Index semantics (mapping-backed)

Treat the backing index as a **wide, partially dynamic** document: many `long` counters, some `float` durations/percentiles, and **dynamic templates** that type unknown paths under known prefixes as `long` or `float`.

### Core dimensions

- **`cluster_uuid`** (required in mapping meta): primary fleet key.
- **`version`**: Kibana version on the payload (with `major` / `minor` / `patch` multi-fields in mapping).
- **`license.*`**, **`cluster_stats.*`**, **`stack_stats.kibana.*`**: cluster / stack context (useful filters when correlating behavior to ES/Kibana versions).
- **`ess.*`**, **`serverless.*`**: Elastic Cloud / serverless identifiers when present—useful to separate deployment models.

### `rules.*` (alerting)

- **`rules.all.*`**: inventory-style aggregates (counts by type, enabled/disabled, snoozed/muted, maintenance windows, connector types by consumer, etc.).
- **`rules.daily.*`**: **rolling / per-day style** execution health (runs, failures by reason, timeouts, durations, percentiles of alerts/actions)—aligns with collector fields like `count_rules_executions_*`, `percentile_num_*`, `avg_*_per_day` in `AlertingUsage`.
- **`rules.tasks.daily.*`**: task-manager-oriented failure views (see mapping `failedOrUnrecognized*` paths).

**Rule type ids** in `totalByType`, `runsByType`, etc. match **Kibana rule type ids** (e.g. `siem__queryRule`, `__index-threshold`, `apm__error_rate`). New rule types generally appear as **new dynamic keys** under the `path_match` families in your backing template (e.g. `rules.all.totalByType.*` → `long`).

### `connectors.*` (actions)

- **`connectors.all.*`**: totals, `totalByType`, `totalInUseByType`, `totalByGenAiProviderType`, email breakdowns (`emailConnectorsByServiceType.*`), namespaces, alert-history flags.
- **`connectors.daily.*`**: per-day runs, failures, durations, outcomes (`byOutcome.*.*`).

Connector type keys are typically **action type ids** (often `__slack`, `__email`, …). **Renames / duplicates** (e.g. `__Slack` vs `__slack`) can coexist—**sum intentionally** with `COALESCE` across variants.

**GenAI provider** fields (`totalByGenAiProviderType.*`) use **human-readable labels** including spaces (`Azure OpenAI`, …)—in ES|QL you must **backtick** those subfield paths.

### `cases.*`

Nested **`cases.cases`**, **`cases.comments`**, **`cases.alerts`**, **`cases.configuration`**, **`cases.connectors`**, **`cases.pushes`**, **`cases.userActions`** mirror the Cases telemetry pipeline assembled in `cases/server/telemetry/collect_telemetry_data.ts` (queries under `cases/server/telemetry/queries/`).

Space flavors **`all` / `main` / `obs` / `sec`** appear where the product splits metrics by solution space.

### Other prominent families in your mapping

- **`reporting.all.*`**: scheduled report counts by type, notifications, enabled flags.
- **`taskManager.tasks.*`**: TM health signals (failed counts, ephemeral stats, excluded types).
- **`backfill.*`**: alerting backfill / gap-fill style counters when present.
- **`apiKeys.all.*`**: e.g. rules using user-created API keys (`numRulesWithUserCreatedApiKeys`).

### Dynamic templates (high signal)

Unknown keys under paths like:

- `rules.all.totalByType.*`, `rules.all.totalEnabledByType.*`, `rules.daily.count.*ByType*`, …
- `connectors.all.totalByType.*`, `connectors.daily.count.runsByType.*`, …
- `rules.all.count.connectorTypesByConsumers.*.*`, cases `customFields.totalsByType.*`, …

…are mapped as **`long`** (or **`float`** for `avg` / `percentiles` style paths). Practically: **new product versions can introduce new dotted fields without a repo mapping update**—discover via `LIMIT 1` / column listing, then aggregate defensively.

---

## Authentication

- Prefer **`STACK_TELEMETRY_API_KEY`** (or equivalent) from the environment—not keys in repo or chat. Local pattern: **`.cursor/settings.json.example`** → **`.cursor/settings.json`** (gitignored), then merge **`terminal.integrated.env.osx`** into **`.vscode/settings.json`** or Cursor user settings so the **integrated terminal** exports the variable (Cursor does not load `.cursor/settings.json` by itself).
- **`Authorization: ApiKey <base64(id:api_key)>`** where the value is Base64 of the UTF-8 string `id:api_key`.
- Mutating Kibana requests: send **`kbn-xsrf: true`** (or `kbn-xsrf: kibana`).

### Creating your own stack-telemetry API key

1. Open Kibana **API keys** on stack-telemetry: [https://stack-telemetry.elastic.dev/app/management/security/api_keys/](https://stack-telemetry.elastic.dev/app/management/security/api_keys/)
2. **Create API key** — recognizable name, narrow privileges where possible.
3. Copy the **encoded** value once; store in a secret manager, not git.
4. Export as **`STACK_TELEMETRY_API_KEY`**. Test:  
   `curl -sS -H "Authorization: ApiKey $STACK_TELEMETRY_API_KEY" "https://stack-telemetry.elastic.dev/api/status"`

---

## Where ES|QL runs (derive Elasticsearch URL)

`stack-telemetry.elastic.dev` is a **Kibana** front door. **ES|QL executes on Elasticsearch** (`POST …/_query`).

1. Authenticated **`GET https://stack-telemetry.elastic.dev/api/status`** with `Authorization: ApiKey …`.
2. Response header **`reporting-endpoints`** includes a host like `https://stack-telemetry.kb.us-west2.gcp.elastic-cloud.com`.
3. Replace **`kb`** with **`es`** → derive ES base (region/provider can differ; **always derive from the header**).
4. Run **`POST <es-base>/_query`** with `Content-Type: application/json`, body `{"query": "…"}`.

On this stack, Kibana **internal** ES|QL routes often return *not available with the current configuration*—use **Elasticsearch `/_query`** for `response-ops` ad-hoc ES|QL.

**Kibana-only helpers:** `GET …/s/response-ops/api/data_views` lists data views; the telemetry view **title** is **`response-ops`**.

---

## Fleet rollup: latest snapshot per `cluster_uuid`, then sum one metric

**Default for long lookbacks** — avoids **`INLINESTATS`** (*sub-plan execution results too large*).

**Idea:** Build a fixed-width sort key from **`TO_LONG(timestamp)`** and the metric (zero-padded), **`VALUES(pair) BY cluster_uuid`**, **`MV_MAX(pairs)`**, recover the metric with **`MV_LAST(SPLIT(best, "_"))`**, then **`SUM`** across clusters.

```esql
FROM response-ops
| WHERE timestamp > now() - 6 months
| KEEP cluster_uuid, timestamp, `METRIC_FIELD`
| EVAL ms = TO_LONG(timestamp)
| EVAL tstr = TO_STRING(ms)
| EVAL tpad = CONCAT(SUBSTRING("00000000000000000000", 1, 20 - LENGTH(tstr)), tstr)
| EVAL cstr = TO_STRING(`METRIC_FIELD`)
| EVAL cpad = CONCAT(SUBSTRING("000000000000", 1, 12 - LENGTH(cstr)), cstr)
| EVAL pair = CONCAT(tpad, "_", cpad)
| STATS pairs = VALUES(pair) BY cluster_uuid
| EVAL best = MV_MAX(pairs)
| EVAL metric_latest = TO_LONG(MV_LAST(SPLIT(best, "_")))
| STATS total = SUM(metric_latest), reporting_clusters = COUNT(*)
```

**Edits:** adjust **`WHERE`**; replace **`METRIC_FIELD`** (backtick dotted names); widen padding if counters exceed **`999_999_999_999`**; for **nullable** metrics use **`EVAL m = COALESCE(\`METRIC_FIELD\`, 0)`** and build **`pair`** from **`m`**. For **`float`** metrics, use **`TO_DOUBLE`** in the encoded sort value instead of **`TO_LONG`**.

**Multiple rows at same `timestamp`:** collapse first with **`STATS m = SUM(\`METRIC_FIELD\`) BY cluster_uuid, timestamp`** then rebuild **`pair`** from **`m`**.

---

## Optional: `INLINESTATS`

```esql
FROM response-ops
| WHERE timestamp > now() - 6 months
| INLINESTATS max_ts = MAX(timestamp) BY cluster_uuid
| WHERE timestamp == max_ts
| STATS per_cluster = SUM(`METRIC_FIELD`) BY cluster_uuid
| STATS total = SUM(per_cluster), reporting_clusters = COUNT(*)
```

If this fails with *sub-plan execution results too large*, use the **`VALUES` / `MV_MAX`** pipeline.

---

## Connectors: fleet total vs by type

- **All connector instances:** **`connectors.all.total`**
- **By type:** **`connectors.all.totalByType.__slack`** (etc.)
- **Slack product family:** combine **`__slack`**, **`__slack_api`**, **`__slack2`**, **`__Slack`**, … with **`EVAL slack = COALESCE(\`…\`,0)+…`** then rollup **`slack`**.

**GenAI providers:** aggregate **`connectors.all.totalByGenAiProviderType.\`Azure OpenAI\``** (backticks for spaces).

---

## Schema discovery quick queries

```esql
FROM response-ops
| WHERE timestamp > now() - 6 months
| KEEP timestamp, cluster_uuid, version, rules.all.total, connectors.all.total
| SORT timestamp DESC
| LIMIT 20
```

```esql
FROM response-ops
| WHERE timestamp > now() - 30 days
| STATS clusters = COUNT_DISTINCT(cluster_uuid), rows = COUNT(*)
```

---

## Other telemetry (logs / metrics / APM)

| Question | Prefer |
|----------|--------|
| Log triage, errors, noise | **observability-logs-search** (ES|QL, narrow `KEEP`) |
| Service health, SLOs | **observability-service-health** |
| General ES|QL mechanics | **elasticsearch-esql** |

---

## Cross-cutting habits

- **Scope:** `cluster_uuid` for stack-telemetry snapshots; add **`version`**, **`license.type`**, **`serverless.*`** for cohorts.
- **Token discipline:** small `LIMIT`, small **`KEEP`** sets.
- **Report:** index/pattern, time range, dedupe logic, partial/caps/auth failures.
- **Gaps:** cases collector **`{}`** vs zeros; **`has_errors`**; clusters with no rows in-window.

---

## When not to use this skill

- Pure code review with no cluster access.
- Non-Elastic sources unless the user points at that integration.
- **Do not infer code paths from field names alone**—use collector/task references when claiming cadence or source of truth.

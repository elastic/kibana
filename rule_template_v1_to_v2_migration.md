# Migrating integration rule templates: v1 → v2

Guide for converting Fleet/integration `kibana/alerting_rule_template/*.json` assets from the current (v1 / shared `.es-query` params) shape to the alerting **v2** template shape.

## Required for all v2 rule templates

| Requirement | Value | Notes |
| --- | --- | --- |
| Engine | `"engine": "v2"` | **Required on every v2 rule template.** Marks the asset for the alerting v2 engine / rule library. |

`recovery_strategy` is optional and supports the same values as create-rule (`no_breach` | `query` | `none`). For most integrations migrating from v1 ES|QL templates, prefer `"no_breach"`. Omitting it is treated as recovery disabled by the executor.

### Backwards compatibility (Saved Object model versions)

Do **not** add a `schema_version` field on integration assets. Installed `alerting_rule_template` documents are versioned by Kibana **Saved Object model versions** (`typeMigrationVersion` / `ruleTemplateModelVersions`).

When the template attribute shape (or create-rule mapping) must change incompatibly:

1. Add a new `alerting_rule_template` model version with mappings / `data_backfill` (or other changes) that migrates existing docs to the current shape.
2. Update the Zod template schema in `@kbn/alerting-v2-schemas` (`ruleTemplateDataSchema`) to match that current shape.
3. Instantiation via `createRuleDataFromTemplate()` in `@kbn/alerting-v2-plugin` strips `engine` and validates against the current create-rule schema.

After SO migrations run, readers can assume attributes match the current template schema.

## Field transition table

| v1 (integrations / `.es-query` params) | v2 template | Action |
| --- | --- | --- |
| *(missing or unset)* | `engine` | **Set** to `"v2"`. |
| *(missing)* | `recovery_strategy` | **Optional.** Same as create-rule (`no_breach` \| `query` \| `none`). Prefer `"no_breach"` for typical v1 ES\|QL migrations. |
| *(missing)* | `kind` | **Set** to `"alert"` (or `"signal"` when appropriate). |
| `name` | `metadata.name` | **Move** under `metadata`. |
| `description` | `metadata.description` | **Move** under `metadata`. |
| `tags` | `metadata.tags` | **Move** under `metadata`. |
| `schedule.interval` | `schedule.every` | **Rename** (`"1m"` stays a duration string). |
| `params.timeWindowSize` + `params.timeWindowUnit` | `schedule.lookback` | **Combine** into one duration string (e.g. `15` + `"m"` → `"15m"`) and place under `schedule`. |
| `params.timeField` | `time_field` | **Promote** to top-level attributes and rename to snake_case. |
| `params.esqlQuery.esql` | `query` | **Reshape** into the v2 query object (`composed` or `standalone`). See [Query reshape](#query-reshape) below. Drop the `esqlQuery` wrapper. |
| `params.grouping` | `grouping` | **Promote** `{ "fields": [...] }` to top-level. |
| `alertDelay.active` | `state_transition.pending_count` | **Map** consecutive-breach delay into `state_transition`. Drop `alertDelay`. |
| `ruleTypeId` | — | **Remove** (v2 templates are not bound to `.es-query`). |
| `flapping` | — | **Remove** (not part of v2 template / rule schema). |
| `params.searchType` | — | **Remove** (implied by top-level ES\|QL `query`). |
| `params.size` | — | **Remove** (not used for v2 ES\|QL templates). |
| `params.threshold` / `params.thresholdComparator` | — | **Remove** (conditions live in the ES\|QL query). |
| `params.groupBy` | — | **Remove** (grouping is `grouping.fields`; per-row behavior is implied). |
| `params.termField` / `params.termSize` | — | **Remove** (unused on ES\|QL path; were leftover shared params). |
| `params` (object) | — | **Remove** once all fields above are migrated. |
| `artifacts.investigation_guide.blob` | `artifacts[]` (`type: "runbook"`) | **Reshape** into the v2 artifact array. Map `blob` → `value`; set `type` to `"runbook"`; provide a stable `id`. Linked dashboards become `{ "type": "dashboard", "id": "…", "value": "<dashboardId>" }`. |
| `id` / `type` / `managed` | `id` / `type` / `managed` | **Keep** SO envelope unchanged (`type`: `alerting_rule_template`). |

## Query reshape

v1 stores a single ES|QL string in `params.esqlQuery.esql`. v2 uses a discriminated `query` object:

| Format | When to use | Shape |
| --- | --- | --- |
| `composed` | Preferred for templates with a clear shared data query + breach filter (most ES\|QL integration templates). | `{ "format": "composed", "base": "<FROM/STATS…>", "breach": { "segment": "<WHERE…>" } }` |
| `standalone` | Full self-contained breach query, or when base/breach cannot be cleanly split. | `{ "format": "standalone", "breach": { "query": "<full ES\|QL>" } }` |

With `recovery_strategy: "no_breach"`, do **not** add a `recovery` block. (A `recovery` segment/query is only valid when `recovery_strategy` is `"query"`.)

**Composed split rule of thumb:** put the index source + aggregations/`BY` fields in `base`; put the alerting condition (`WHERE …`) and any trailing `SORT` / `KEEP` / `LIMIT` in `breach.segment`. A leading `|` on the segment is optional.

## Example (before → after)

**Before (v1-style integration asset):**

```json
{
  "attributes": {
    "name": "[Kubernetes OTel] Pod CrashLoopBackOff",
    "description": "...",
    "tags": ["Kubernetes"],
    "ruleTypeId": ".es-query",
    "schedule": { "interval": "1m" },
    "alertDelay": { "active": 3 },
    "flapping": { "enabled": true, "lookBackWindow": 10, "statusChangeThreshold": 4 },
    "engine": "v2",
    "params": {
      "searchType": "esqlQuery",
      "esqlQuery": { "esql": "TS metrics-... | WHERE restarts > 0 | ..." },
      "timeField": "@timestamp",
      "timeWindowSize": 15,
      "timeWindowUnit": "m",
      "groupBy": "row",
      "termField": "k8s.pod.name",
      "termSize": 50,
      "grouping": { "fields": ["k8s.pod.name", "k8s.container.name", "k8s.namespace.name"] },
      "size": 0,
      "threshold": [0],
      "thresholdComparator": ">"
    },
    "artifacts": { "investigation_guide": { "blob": "..." } }
  }
}
```

**After (v2 template shape):**

```json
{
  "attributes": {
    "schema_version": 1,
    "kind": "alert",
    "engine": "v2",
    "recovery_strategy": "no_breach",
    "metadata": {
      "name": "[Kubernetes OTel] Pod CrashLoopBackOff",
      "description": "...",
      "tags": ["Kubernetes"]
    },
    "schedule": {
      "every": "1m",
      "lookback": "15m"
    },
    "time_field": "@timestamp",
    "query": {
      "format": "composed",
      "base": "TS metrics-... | STATS restarts = MAX(...) BY k8s.pod.name, ...",
      "breach": {
        "segment": "WHERE restarts > 0 | SORT restarts DESC | KEEP ... | LIMIT 50"
      }
    },
    "grouping": {
      "fields": ["k8s.pod.name", "k8s.container.name", "k8s.namespace.name"]
    },
    "state_transition": {
      "pending_count": 3
    },
    "artifacts": [
      {
        "id": "kubernetes_otel-pod-crashloopbackoff-v2-runbook",
        "type": "runbook",
        "value": "## Pod CrashLoopBackOff\n..."
      }
    ]
  }
}
```

**Standalone alternative** (same effective breach query, no base/segment split):

```json
"query": {
  "format": "standalone",
  "breach": {
    "query": "TS metrics-... | STATS ... BY ... | WHERE restarts > 0 | SORT ... | KEEP ... | LIMIT 50"
  }
}
```

## Checklist for package authors

1. Set `engine: "v2"`. Optionally set `recovery_strategy` (`no_breach` recommended for typical migrations).
2. Set `kind` (`"alert"` for stateful alerting templates).
3. Nest `name` / `description` / `tags` under `metadata`.
4. Rename `schedule.interval` → `schedule.every`; move lookback into `schedule.lookback`.
5. Reshape `params.esqlQuery.esql` into `query` (`composed` preferred, or `standalone`); promote `grouping` and `time_field`.
6. Map `alertDelay.active` → `state_transition.pending_count`.
7. Map `artifacts.investigation_guide.blob` → `artifacts: [{ id, type: "runbook", value }]`.
8. Delete `ruleTypeId`, `flapping`, and the entire `params` object.
9. Keep `id`, `type`, and `managed` on the SO envelope.

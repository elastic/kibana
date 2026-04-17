# Alerting v2 System Reference

> Everything needed to understand and create alerting v2 rules, derived from source code.

---

## Architecture overview

Alerting v2 is a Kibana plugin (`alertingVTwo`, config path `xpack.alerting_v2`) that replaces the solution-specific rule type system in v1 with a single, declarative rule model built on ES|QL. Rules are data, not code.

### Core components

| Component | Role |
|-----------|------|
| **Rule** | Declarative ES|QL-based detection config: query, schedule, recovery, grouping, state transitions |
| **Director** | Manages episode lifecycles: evaluates state transitions per group per execution cycle |
| **Dispatcher** | Separate pipeline that matches episodes to notification policies and dispatches to workflows |
| **Notification policy** | First-class object with KQL matchers that route episodes to workflow destinations |
| **Episode** | A durable alert lifecycle: `inactive → pending → active → recovering → inactive` |

### Execution pipeline (rule side)

Steps run in fixed order per rule execution cycle:

```
WaitForResources → FetchRule → ValidateRule → ExecuteRuleQuery
  → CreateAlertEvents → CreateRecoveryEvents → Director → StoreAlertEvents
```

1. **ExecuteRuleQuery**: Runs the ES|QL `evaluation.query.base` with a time-range filter derived from `time_field` and `schedule.lookback ?? schedule.every`
2. **CreateAlertEvents**: Materializes breach events from query results
3. **CreateRecoveryEvents**: For `kind: 'alert'` rules, checks active group hashes and either applies `no_breach` recovery (groups no longer breaching) or runs a separate recovery ES|QL query
4. **Director**: For each group hash, loads the latest episode state, picks a transition strategy, and computes the next episode status + ID

### Dispatcher pipeline (notification side)

Runs independently via Task Manager, not inline with rule execution:

```
FetchEpisodes → FetchSuppressions → ApplySuppression → FetchRules → FetchPolicies
  → EvaluateMatchers → BuildGroups → ApplyThrottling → Dispatch → StoreActions
```

The dispatcher evaluates **KQL matchers** from notification policies against a `MatcherContext` built from rule metadata (id, name, tags) and episode state. Every routing decision (fire, suppress, throttle, unmatched) is recorded.

---

## Plugin configuration

```yaml
xpack.alerting_v2.enabled: true
```

Required dependencies: `taskManager`, `features`, `spaces`, `data`, `dataViews`, `esql`, `kql`, `lens`, `security`, `encryptedSavedObjects`, `workflowsManagement`, `expressions`, `uiActions`, `fieldFormats`, `charts`, `management`, `kibanaUtils`.

---

## API endpoints

Base URL: `http://localhost:<port>` (port from `server.port` in `kibana.dev.yml`)

All APIs are experimental (`availability: { stability: 'experimental' }`).

### Rules — `/api/alerting/v2/rules`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/alerting/v2/rules` | Create rule (auto-generated ID) |
| POST | `/api/alerting/v2/rules/{id}` | Create rule (custom ID) |
| GET | `/api/alerting/v2/rules/{id}` | Get rule by ID |
| GET | `/api/alerting/v2/rules` | List rules (paginated, filterable, sortable) |
| GET | `/api/alerting/v2/rules/_bulk` | Bulk get rules by IDs (max 1000) |
| PATCH | `/api/alerting/v2/rules/{id}` | Update rule (partial) |
| DELETE | `/api/alerting/v2/rules/{id}` | Delete rule |
| GET | `/api/alerting/v2/rules/_tags` | Get all unique rule tags |
| POST | `/api/alerting/v2/rules/_bulk_enable` | Bulk enable rules |
| POST | `/api/alerting/v2/rules/_bulk_disable` | Bulk disable rules |
| POST | `/api/alerting/v2/rules/_bulk_delete` | Bulk delete rules |

### Notification policies — `/api/alerting/v2/notification_policies`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/alerting/v2/notification_policies` | Create policy |
| POST | `/api/alerting/v2/notification_policies/{id}` | Create policy (custom ID) |
| GET | `/api/alerting/v2/notification_policies` | List policies |
| GET | `/api/alerting/v2/notification_policies/{id}` | Get policy |
| PUT | `/api/alerting/v2/notification_policies/{id}` | Update policy (requires `version`) |
| DELETE | `/api/alerting/v2/notification_policies/{id}` | Delete policy |
| POST | `.../notification_policies/{id}/_enable` | Enable policy |
| POST | `.../notification_policies/{id}/_disable` | Disable policy |
| POST | `.../notification_policies/{id}/_snooze` | Snooze policy |
| POST | `.../notification_policies/{id}/_unsnooze` | Unsnooze policy |
| POST | `.../notification_policies/{id}/_update_api_key` | Rotate API key |
| POST | `.../notification_policies/_bulk` | Bulk actions |

### Alert actions — `/api/alerting/v2/alerts`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `.../alerts/{group_hash}/action/_ack` | Acknowledge alert |
| POST | `.../alerts/{group_hash}/action/_unack` | Unacknowledge alert |
| POST | `.../alerts/{group_hash}/action/_tag` | Tag alert |
| POST | `.../alerts/{group_hash}/action/_snooze` | Snooze alert |
| POST | `.../alerts/{group_hash}/action/_unsnooze` | Unsnooze alert |
| POST | `.../alerts/{group_hash}/action/_activate` | Activate alert |
| POST | `.../alerts/{group_hash}/action/_deactivate` | Deactivate alert |
| POST | `.../alerts/action/_bulk` | Bulk alert actions |

### Suggestions

| Method | Path | Purpose |
|--------|------|---------|
| POST | `.../notification_policies/suggestions/values` | Matcher value suggestions |
| GET | `.../notification_policies/suggestions/data_fields` | Matcher data field suggestions |
| GET | `.../notification_policies/suggestions/tags` | Notification policy tag suggestions |

### Required headers

```
kbn-xsrf: true
Content-Type: application/json
```

Because the APIs are experimental, you also need:

```
x-elastic-internal-origin: kibana
```

---

## Rule schema (create)

The canonical schema is the Zod `createRuleDataSchema` in `@kbn/alerting-v2-schemas`.

```jsonc
{
  // REQUIRED
  "kind": "alert" | "signal",
  "metadata": {
    "name": "string (1-256 chars, required)",
    "description": "string (max 1024, optional)",
    "owner": "string (max 256, optional)",
    "tags": ["string (max tag length)", "..."] // max 100 tags, optional
  },
  "time_field": "@timestamp",  // default: @timestamp, max 128 chars
  "schedule": {
    "every": "5m",             // duration string, minimum 5s
    "lookback": "10m"          // optional, defaults to `every` value
  },
  "evaluation": {
    "query": {
      "base": "FROM index-* | ..."  // ES|QL string, 1-10000 chars, validated by parser
    }
  },

  // OPTIONAL
  "recovery_policy": {
    "type": "no_breach" | "query",
    "query": {                       // required when type is "query"
      "base": "FROM index-* | ..."   // separate ES|QL for recovery detection
    }
  },
  "state_transition": {              // only allowed when kind is "alert", nullable
    "pending_operator": "AND" | "OR",
    "pending_count": 3,              // 0-1000; 0 = skip pending entirely
    "pending_timeframe": "10m",
    "recovering_operator": "AND" | "OR",
    "recovering_count": 5,           // 0-1000; 0 = skip recovering entirely
    "recovering_timeframe": "15m"
  },
  "grouping": {
    "fields": ["host.name", "service.name"]  // max 16 fields
  },
  "no_data": {
    "behavior": "no_data" | "last_status" | "recover",
    "timeframe": "15m"
  },
  "artifacts": [
    { "id": "string", "type": "string", "value": "string" }
  ]
}
```

### Validation rules

- `state_transition` is only allowed when `kind === 'alert'`; must be `null` or absent for signal rules
- `recovery_policy.query.base` is required when `recovery_policy.type === 'query'`
- `schedule.every` minimum is `5s`, maximum duration for any field is `365d`
- ES|QL `base` is parsed by `@elastic/esql Parser` — syntax errors are rejected
- Duration format: `<number><unit>` where unit is `ms`, `s`, `m`, `h`, `d`, `w`

### Rule response (additional fields)

```jsonc
{
  "id": "uuid",
  "enabled": true,
  "createdBy": "user",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedBy": "user",
  "updatedAt": "2025-01-01T00:00:00.000Z"
  // ... plus all create fields
}
```

---

## Rule kinds

| Kind | Purpose | State transitions | Recovery |
|------|---------|-------------------|----------|
| `alert` | Detection rules that produce episodes with full lifecycle | Full lifecycle with optional `state_transition` config | `no_breach` or independent `query` |
| `signal` | Signal generation for downstream consumption | No `state_transition` allowed | No recovery logic |

---

## Episode lifecycle

Episodes are the durable identity of an alert across execution cycles:

```
inactive → pending → active → recovering → inactive
```

### State machine (basic strategy)

| Current state | breached event | recovered event | no_data event |
|--------------|----------------|-----------------|---------------|
| inactive | → pending | → inactive | → inactive |
| pending | → active | → inactive | → pending |
| active | → active | → recovering | → active |
| recovering | → active | → inactive | → recovering |

### Count/timeframe strategy

Extends the basic strategy with configurable thresholds:

- **`pending_count: N`**: N consecutive breaches required before `pending → active`. Setting to `0` skips pending entirely (`inactive → active`).
- **`pending_timeframe: '10m'`**: Episode must have been in pending state for this long before transitioning to active.
- **`pending_operator: 'AND' | 'OR'`**: How to combine count and timeframe (default: `OR`).
- **`recovering_count: N`**: N consecutive recoveries required before `recovering → inactive`. Setting to `0` skips recovering entirely (`active → inactive`).
- **`recovering_timeframe`** and **`recovering_operator`**: Same logic for the recovery side.

The strategy factory selects `CountTimeframeStrategy` when `state_transition` is non-null and has keys; otherwise falls back to `BasicTransitionStrategy`.

---

## How ES|QL queries execute

1. The `evaluation.query.base` string is the complete ES|QL query including any trigger condition (e.g., a trailing `WHERE` clause).
2. A **time-range filter** is automatically applied as a `bool.filter` range on `time_field`:
   - `gt`: `now - lookbackWindow` (where lookback defaults to `schedule.every`)
   - `lte`: `now`
3. If the query contains `?_tstart` or `?_tend` parameters, they are bound to the computed start/end timestamps.
4. Results are streamed in batches via `QueryService.executeQueryStream`.

### Recovery queries

When `recovery_policy.type === 'query'`, the `CreateRecoveryEventsStep` runs a **completely separate ES|QL query** (`recovery_policy.query.base`) against the same time window. Recovery results are compared against currently active group hashes to determine which episodes should recover.

---

## Notification policy schema (create)

```jsonc
{
  "name": "string (required)",
  "description": "string (required)",
  "destinations": [
    { "type": "workflow", "id": "workflow-id" }  // at least one required
  ],
  "matcher": "env == 'production' && region == 'us-east-1'",  // KQL, optional
  "groupBy": ["service.name", "environment"],                  // optional
  "tags": ["string"],                                          // max 20 tags, optional
  "groupingMode": "per_episode" | "all" | "per_field",        // optional
  "throttle": {
    "strategy": "on_status_change" | "per_status_interval" | "time_interval" | "every_time",
    "interval": "5m"  // required for per_status_interval and time_interval strategies
  }
}
```

### Grouping mode + throttle strategy constraints

| Grouping mode | Allowed strategies |
|---------------|-------------------|
| `per_episode` (default) | `on_status_change`, `per_status_interval`, `every_time` |
| `all` or `per_field` | `time_interval`, `every_time` |

Strategies `per_status_interval` and `time_interval` require an `interval` to be set.

### How policies match episodes

Policies are **not referenced by rules**. The dispatcher's `EvaluateMatchersStep` builds a `MatcherContext` from rule metadata (id, name, tags, timestamps) and episode data, then evaluates each policy's KQL `matcher` against it. A single policy can match episodes from many rules.

---

## Grouping

The `grouping.fields` array (max 16) maps to the ES|QL `GROUP BY` columns. Each unique combination of grouped field values produces a distinct alert group (identified by a `group_hash`). Episodes are tracked per group hash.

If no grouping is specified, all matching rows produce a single alert group.

---

## No-data handling

| Behavior | Meaning |
|----------|---------|
| `no_data` | Treat absence of data as a no-data alert event |
| `last_status` | Maintain the previous episode status when no data arrives |
| `recover` | Treat no data as recovery (auto-resolve) |

The `timeframe` controls how long to wait before declaring "no data."

---

## Key source code locations

| Area | Path |
|------|------|
| Plugin entry | `x-pack/platform/plugins/shared/alerting_v2/` |
| Rule Zod schema | `x-pack/platform/packages/shared/response-ops/alerting-v2-schemas/src/rule_data_schema.ts` |
| Notification policy Zod schema | `.../alerting-v2-schemas/src/notification_policy_data_schema.ts` |
| ES|QL validation | `.../alerting-v2-schemas/src/validation.ts` |
| Schema constants | `.../alerting-v2-schemas/src/constants.ts` |
| API path constants | `.../alerting-v2-constants/index.ts` |
| Rule routes | `alerting_v2/server/routes/rules/` |
| Query payload (time range) | `alerting_v2/server/lib/rule_executor/get_query_payload.ts` |
| ExecuteRuleQueryStep | `alerting_v2/server/lib/rule_executor/steps/execute_rule_query_step.ts` |
| CreateRecoveryEventsStep | `.../steps/create_recovery_events_step.ts` |
| Director | `alerting_v2/server/lib/director/director.ts` |
| Basic transition strategy | `.../director/strategies/basic_strategy.ts` |
| Count/timeframe strategy | `.../director/strategies/count_timeframe_strategy.ts` |
| Dispatcher pipeline | `alerting_v2/server/lib/dispatcher/execution_pipeline.ts` |
| Dispatcher steps | `.../dispatcher/steps/` |
| Notification policy routes | `alerting_v2/server/routes/notification_policies/` |
| FTR API tests | `x-pack/platform/test/api_integration_deployment_agnostic/apis/alerting_v2/` |
| Scout E2E tests | `alerting_v2/test/scout_alerting_v2/api/tests/` |

---

## Example: minimal rule create

```json
{
  "kind": "alert",
  "metadata": { "name": "test-alert-rule" },
  "time_field": "@timestamp",
  "schedule": { "every": "5m" },
  "evaluation": { "query": { "base": "FROM logs-* | LIMIT 10" } }
}
```

## Example: full rule with all options

```json
{
  "kind": "alert",
  "metadata": {
    "name": "full-rule",
    "owner": "team-a",
    "tags": ["critical", "prod"]
  },
  "time_field": "@timestamp",
  "schedule": { "every": "5m", "lookback": "10m" },
  "evaluation": {
    "query": {
      "base": "FROM logs-* | LIMIT 10 | WHERE status == \"error\""
    }
  },
  "recovery_policy": { "type": "no_breach" },
  "state_transition": { "pending_count": 3 },
  "grouping": { "fields": ["host.name"] },
  "no_data": { "behavior": "recover", "timeframe": "15m" }
}
```

## Example: rule with independent recovery query

```json
{
  "kind": "alert",
  "metadata": { "name": "cpu-spike-with-scale-recovery" },
  "time_field": "@timestamp",
  "schedule": { "every": "1m", "lookback": "5m" },
  "evaluation": {
    "query": {
      "base": "FROM metrics-* | WHERE cpu_usage > 90 | STATS max_cpu = MAX(cpu_usage) BY host.name"
    }
  },
  "recovery_policy": {
    "type": "query",
    "query": {
      "base": "FROM deployments-* | WHERE status == \"scaled_up\" | STATS count = COUNT(*) BY host.name"
    }
  },
  "grouping": { "fields": ["host.name"] }
}
```

## Example: full state transition config

```json
{
  "state_transition": {
    "pending_operator": "AND",
    "pending_count": 3,
    "pending_timeframe": "10m",
    "recovering_operator": "OR",
    "recovering_count": 5,
    "recovering_timeframe": "15m"
  }
}
```

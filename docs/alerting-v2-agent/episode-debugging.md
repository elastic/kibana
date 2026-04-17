# Episode Debugging Guide

How to investigate why an alerting v2 episode triggered, what data it captured, and whether the current rule configuration matches the historical episode data.

## Investigation Checklist

When a user asks "why did this episode trigger?" or "these numbers don't match the threshold", follow these steps:

### 1. Gather the episode events

Query `.rule-events` for the episode ID. Use `METADATA _source` in ES|QL to get the full document including `data.*` fields (which are `flattened` and invisible to normal ES|QL column access).

**What to extract:**
- `data.*` field names and values — what the rule captured at each evaluation
- `rule.id` and `rule.version` — which rule and which version produced each event
- `@timestamp` range — when the episode was active
- `status` values — `breached`, `recovered`, `no_data`
- `episode.status` and `episode.status_count` — state machine progression

**Key insight:** The `data` field is `flattened` in `.rule-events`. ES|QL cannot access sub-fields (e.g., `data.avg_cpu` returns "Unknown column"). Use `METADATA _source` or the regular `_search` API to see actual values.

### 2. Fetch the current rule definition

Get the rule via the API (`GET /api/alerting/v2/rules/{id}`) or from `.kibana_alerting_cases`.

**What to extract:**
- `evaluation.query.base` — the full ES|QL query including any threshold WHERE clause
- `grouping.fields` — how episodes are grouped
- `schedule.every` and `schedule.lookback` — how often and how far back the rule evaluates
- `state_transition.pending_count` — consecutive breaches required before active
- `createdAt` and `updatedAt` — whether the rule was modified after the episode started

### 3. Compare episode data against the threshold

The core question: do the `data.*` values in the episode events actually exceed the threshold in the rule's `WHERE` clause?

**If values are BELOW the current threshold but the episode is marked "breached":**

The rule's threshold was likely **changed after the episode was created**. Alerting v2 does not store rule version history, so the original threshold is lost. To confirm:

- Check `createdAt` vs `updatedAt` on the rule — if they differ, the rule was modified
- Check `rule.version` on the episode events — a version change during the episode confirms the rule was updated mid-episode

### 4. Understand how breached status is assigned

Every row returned by the rule's ES|QL query is assigned `status: 'breached'`. There is no separate threshold evaluation — the threshold is the WHERE clause in the ES|QL query itself. If a row passes the query, it's a breach.

This means:
- The rule executor trusts the ES|QL query completely
- There is no stored "threshold field" or "threshold value" separate from the query
- To change the threshold, you must edit the query's WHERE clause

### 5. Check grouping vs STATS mismatch

The rule's `grouping.fields` determines how episodes are created (one episode per unique combination of grouping field values). But the ES|QL `STATS ... BY` clause can group by **different or additional fields**.

When the STATS BY fields are more granular than the grouping fields, a single episode receives events from multiple entities. For example, if a rule groups by `pod.name` but STATS groups by `pod.name, container.name`, all containers in the same pod map to one episode. Some may exceed the threshold while others don't — but all rows that pass the WHERE filter become events in the same episode.

### 6. Check the source data

Verify the source index still has data by querying it directly. The rule's `FROM` clause tells you the index.

**Gotchas:**
- Remote cluster (CCS) data may be purged by ILM
- The `kibana_system_user` may not have permissions to read remote cluster indices — use the admin user or the same user that created the rule
- ES|QL `_query` API may not resolve CCS field names when called directly; route queries through Kibana or use the `_search` API instead

## Common Debugging Scenarios

### "The metric is below the threshold but the episode is breached"
→ The threshold was changed after the episode was created. Check `updatedAt` vs `createdAt`.

### "The chart shows different values than the episode data"
→ The chart queries the source index over a wider time range with time bucketing. Individual evaluation snapshots (in episode events) can differ from bucketed averages.

### "The episode has events for multiple entities"
→ The STATS BY fields are more granular than the grouping fields. Multiple rows map to the same episode.

### "The data field is null in ES|QL queries"
→ The `data` field in `.rule-events` is mapped as `flattened`. ES|QL cannot access sub-fields. Use `METADATA _source` or the `_search` API.

### "No new events are being generated"
→ Check if the source index still has data (ILM may have purged it). Check if the rule is enabled. Check if the user running the rule has read access to the source index.

## Tools Available

| Tool | What it provides |
|------|-----------------|
| `alerting.get_episode_events` | Episode timeline with full `data.*` via `METADATA _source` |
| `alerting.get_rule` | Current rule definition including query and grouping |
| `platform.core.get_index_mapping` | Source index field types (for understanding what data types the rule operates on) |
| `GET .kibana_alerting_cases/_doc/alerting_rule:{id}` | Raw saved object with `createdAt`/`updatedAt` |
| `GET .rule-events/_search` | Direct ES search for episode events with full `_source` |

## Data Model Reference

### `.rule-events` alert event structure

| Field | Type | Description |
|-------|------|-------------|
| `@timestamp` | date | When the event was written |
| `scheduled_timestamp` | date | When the evaluation was scheduled |
| `rule.id` | keyword | Rule that produced this event |
| `rule.version` | integer | Rule version at evaluation time |
| `episode.id` | keyword | Episode this event belongs to |
| `episode.status` | keyword | Episode state: pending, active, recovering, inactive |
| `episode.status_count` | integer | Consecutive count in current state |
| `group_hash` | keyword | SHA-256 of grouping field values |
| `data` | **flattened** | Rule query output row (all values stored as keywords) |
| `status` | keyword | Event status: breached, recovered, no_data |
| `type` | keyword | `alert` (from rule executor) or `signal` |
| `source` | keyword | `internal` |

### Rule threshold mechanics

```
Rule ES|QL query → Elasticsearch → result rows
                                        ↓
                                  Each row → AlertEvent with status: "breached"
                                        ↓
                                  Grouped by grouping.fields → Episode
```

The threshold is the WHERE clause. No rows returned = no breach = recovery (when `recovery_policy.type: "no_breach"`).

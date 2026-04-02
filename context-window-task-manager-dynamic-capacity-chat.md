# Chat context: Task Manager dynamic capacity & related work

**Date (from session):** 2026-04-02  
**Scope:** Task Manager adaptive concurrency, bulk alerting scripts, and follow-up Q&A.

This file is a **handoff summary** of the conversation—not an official product doc. Safe to delete or move out of the repo.

---

## 1. Goals discussed

- **Netflix-style adaptive concurrency** for Task Manager vs existing `createCapacityScan`, poller, event loop behavior.
- **Prototype:** Dynamic capacity from configured floor (`xpack.task_manager.capacity`) up to **`dynamic_capacity.upper_bound`**, using **CPU/load**, **event loop utilization**, **heap** from `core.metrics.getOpsMetrics$()`.
- **Debug logging:** `logTaskManagerCapacityToConsole` in `task_manager_capacity_console_log.ts` (single `no-console` exception).
- **Scale-up gating:** Post-claim utilization (`postClaimUtilizationPct$`), plus inflation to 100% on **RanOutOfCapacity**, **RunningAtCapacity**, **tasksLeftUnclaimed** (`polling_lifecycle.ts`).
- **Scale-up threshold:** Default **`scale_up_min_post_claim_utilization_pct`** = 90 (not only at 100%).
- **Scale-down:** When process signals are unhealthy, decrease by **`scale_down_step`**, never below configured capacity.
- **Oscillation fix:** ES “zero errors” recovery was undoing dynamic scale-down; skip ES recovery **increase** when process signals are unhealthy.
- **ES capacity toggle:** **`adjust_capacity_for_elasticsearch_errors`** — when `false`, capacity ignores 429/script error window; poll interval still reacts. **Default must be `true`** for normal Kibana.
- **Event loop delay:** **`max_event_loop_delay_ms`** in dynamic capacity (complements ELU); **`0`** disables the check.
- **Bulk rules:** `scripts/create_bulk_alerting_rules.mjs` (e.g. 6000 / 1000 rules, `KIBANA_BASE_PATH=/anm`).
- **Delete rules:** `scripts/delete_bulk_alerting_rules.mjs` (`DELETE_COUNT`, same auth/base path/tag as create).

---

## 2. Q&A captured

- **Does each scale-up (e.g. 30→31) require saturation at the current level?**  
  Yes—every scale interval re-checks **`scale_up_min_post_claim_utilization_pct`** against the **latest** `postClaimUtilizationPct$` (current pool semantics). Not a one-time gate. Caveat: snapshot at tick time; failed poll zeros utilization.

- **Why scale-down then immediate “scale-up”?**  
  The **99→100** style bump was **Elasticsearch managed recovery** (`applyErrorWindowToCapacity` with `errorCount === 0`), not dynamic scale-up. Mitigated by skipping that increase when signals are unhealthy.

- **Should dynamic capacity use event loop delay?**  
  Implemented: **`max_event_loop_delay_ms`** (default 10s, `0` = off), using **`process.event_loop_delay`** (ms, max since last collection).

---

## 3. Main files (non-exhaustive)

| Area | Path |
|------|------|
| Config | `x-pack/platform/plugins/shared/task_manager/server/config.ts` |
| Capacity stream | `x-pack/platform/plugins/shared/task_manager/server/lib/capacity_configuration_stream.ts` |
| Console log helper | `x-pack/platform/plugins/shared/task_manager/server/lib/task_manager_capacity_console_log.ts` |
| Tests | `capacity_configuration_stream.test.ts`, `config.test.ts` |
| Poller / utilization | `x-pack/platform/plugins/shared/task_manager/server/polling_lifecycle.ts` |
| Managed config / ES window | `create_managed_configuration.ts` (`applyErrorWindowToCapacity`, `countErrors`) |
| Plugin wiring | `task_manager/server/plugin.ts` (metrics → lifecycle) |
| Bulk rules | `scripts/create_bulk_alerting_rules.mjs` |
| Delete rules | `scripts/delete_bulk_alerting_rules.mjs` |

---

## 4. Configuration reference (`xpack.task_manager`)

- **`adjust_capacity_for_elasticsearch_errors`** — `true` (default): ES error window adjusts capacity. `false`: metrics-only capacity (with dynamic on); poll interval unchanged.
- **`dynamic_capacity.enabled`** — default `true` (tests often force `false` where needed).
- **`dynamic_capacity.upper_bound`**, **`scale_interval_ms`**, **`scale_up_step`**, **`scale_down_step`**
- **`scale_up_min_post_claim_utilization_pct`**
- **`max_event_loop_utilization`**, **`max_heap_used_fraction`**, **`max_load_average_ratio`**
- **`max_event_loop_delay_ms`** — default `10000`; `0` disables delay-based health check.

---

## 5. Testing / CI notes

- Run: `node scripts/jest <path> --config x-pack/platform/plugins/shared/task_manager/jest.config.js`
- **`countErrors`** uses a **10s** flush; it can align with **`scale_interval_ms`** and fight tests. Some tests use **`NEVER`** for `errorCheck$` to isolate dynamic behavior.
- **`node scripts/check_changes.ts`** after edits.
- **`config.test.ts`** snapshots update with `-u` when schema defaults change.

---

## 6. Gotchas discovered in-session

1. **`adjust_capacity_for_elasticsearch_errors`** was briefly **`defaultValue: false`** in schema → broke “ES bump 10→11” expectations; corrected to **`true`**.
2. **Duplicate log lines** can appear from overlapping timers or multiple subscribers; the important fix was stopping ES recovery from fighting dynamic scale-down.
3. **Synthetic `startWith` error** on the merged stream still runs through the same error handler; disabling ES capacity skips that bump entirely on the first event.

---

## 7. Commands used (examples)

```bash
# Create rules
RULE_COUNT=1000 KIBANA_BASE_PATH=/anm node scripts/create_bulk_alerting_rules.mjs

# Delete N rules (same tag/auth as create)
DELETE_COUNT=25 KIBANA_BASE_PATH=/anm node scripts/delete_bulk_alerting_rules.mjs

# Metrics-only capacity (example)
# xpack.task_manager.adjust_capacity_for_elasticsearch_errors: false
```

---

*End of chat context dump.*

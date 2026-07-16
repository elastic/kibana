# Alerting v2 episode-transition POC harness

Test harness for [PR #275654](https://github.com/elastic/kibana/pull/275654)
("Persist explicit episode state transitions"). It stands up flapping Alerting v2
rules against alternating breach/recover `kbn-data-forge` data so you can exercise the persisted
`transition.*` fields, the `episode.status_started_at` discriminator, and the
lossless-under-flapping rule-details activity timeline.

Everything here is disposable POC scaffolding scoped to this worktree.

## What it produces

Two flapping shapes the PR cares about:

- Episode-level flapping (`poc-flappy-episodes`): many short-lived episodes
  (`active -> inactive -> active ...`). `pending_count: 0` + `recovering_count: 0`
  make every breach a new active episode and every recovery an immediate
  `inactive`, so each breach gets a fresh `episode.id` and a reset
  `episode.status_started_at`.
- Single-episode span cycling (`poc-flapping-spans`): ONE long-lived episode that
  oscillates `active -> recovering -> active -> recovering ...`. `recovering ->
  inactive` is gated by `AND(recovering_count 5, recovering_timeframe 10m)`, so a
  3m recover phase (~3 recovering evals, < 5) never fully recovers the episode; it
  re-breaches back to `active` instead. Each run is keyed by its own `episode.status_started_at`.
  This is the primary case for the three-segment lossless render.
- Recovery-query variant (`poc-recovery-query`): same flapping but recovery is
  detected by a custom ES|QL query with a 70-80 hysteresis band, exercising
  `recovery_strategy: "query"`.

## Prerequisites

- Kibana running for this worktree (`./start-kbn.sh`). The script reads
  `server.port` / `elasticsearch.hosts` from `config/kibana.dev.yml`, so it works
  regardless of the per-worktree port (currently 5603 / ES 9203).
- Alerting v2 enabled in your dev config.
- `jq` recommended for `--verify` (falls back to a minimal encoder if absent).

## Quickstart

```bash
cd poc/alerting-v2-transitions

# 1. Start streaming alternating breach/recover CPU data AND upsert the rules
./setup_rules.sh --data-forge

# 2. Let it run a few minutes so several flap cycles accumulate, then verify
./setup_rules.sh --verify

# Re-run any time (idempotent PUT upsert; never duplicates rules)
./setup_rules.sh

# Tear down the rules
./setup_rules.sh --clean
```

`--data-forge` launches `kbn-data-forge` in the background (it streams
indefinitely) and writes to `poc/alerting-v2-transitions/data_forge.log`. Stop it
with the printed `kill <PID>`.

### Overrides

- `KIBANA_URL`, `KIBANA_AUTH` - override the detected Kibana target / creds.
- `ES_URL` - override the Elasticsearch target used by `--data-forge`/`--verify`.
- `--space <id>` - target a non-default space.

## How the flapping is engineered

The FSM ([basic_strategy.ts](../../x-pack/platform/plugins/shared/alerting_v2/server/lib/director/strategies/basic_strategy.ts)):
`active` + `recovered` -> `recovering`; `recovering` + `breached` -> `active`
(immediate). Only `pending -> active` and `recovering -> inactive` are gated by
`state_transition` counts/timeframes
([count_timeframe_strategy.ts](../../x-pack/platform/plugins/shared/alerting_v2/server/lib/director/strategies/count_timeframe_strategy.ts)).
Episode id is preserved until `inactive`.

The data (`flapping_cpu.yaml`) uses the **duration-based looping schedule**
(ported from PR #242216): rather than a sine that must be tuned against the
lookback, it pins `system.cpu.user.pct` to an explicit value per phase and
alternates phases forever — breach (CPU 100, > threshold 80) for 3m, then
recover (CPU 40, < recovery 70) for 3m, repeat. The generator indexes real-time
batches at `now`, so data never lags behind the 1m lookback. `eventsPerCycle: 3`
yields `host-0..host-2` as three sustained timeline lanes.

To make `poc-flapping-spans` keep a single episode alive across troughs, its
`recovering_timeframe` (10m) is much longer than a recover phase (3m) and its
`recovering_count` (5) is more evals than a recover phase produces (~3), so the
`recovering -> inactive` gate is never satisfied before the next breach.

## Verification

`./setup_rules.sh --verify` runs these per rule and prints tables. Expectations:

- `poc-flappy-episodes` -> `episodes` >> 1 (many lifecycles).
- `poc-flapping-spans` -> few `episodes`, `active_runs` > 1, `flaps` > 0.
- `poc-recovery-query` -> transitions whose `ends_status` includes
  `recovering`/`pending`.

### Manual UI check

Open each rule's rule-details activity timeline (Gantt). Confirm
`poc-flapping-spans` renders `active -> recovering -> active` as separate
segments (not one merged `active` span), and that hovering a bar clipped by the
left window edge still reports its true start.

### Paste-ready Dev Tools queries

Replace `RULE_ID` (e.g. `poc-flapping-spans`). Run in Dev Tools
(`POST kbn:/_query`) or Discover's ES|QL editor.

Every transition with the duration of the span it closed:

```esql
FROM .rule-events
| WHERE rule.id == "RULE_ID" AND transition.to IS NOT NULL
| KEEP @timestamp, group_hash, transition.from, transition.to,
       transition.ends_episode_id, transition.ends_status,
       transition.ends_started_at, transition.ends_duration_ms,
       transition.ends_status_count
| SORT @timestamp ASC
```

Total time spent in each status per series:

```esql
FROM .rule-events
| WHERE rule.id == "RULE_ID" AND transition.ends_status IS NOT NULL
| STATS total_ms = SUM(transition.ends_duration_ms),
        spans = COUNT(*),
        avg_ms = AVG(transition.ends_duration_ms)
    BY transition.ends_status, group_hash
| SORT group_hash, transition.ends_status
```

Count flaps (`recovering -> active`) per series:

```esql
FROM .rule-events
| WHERE rule.id == "RULE_ID"
    AND transition.from == "recovering" AND transition.to == "active"
| STATS flaps = COUNT(*) BY group_hash
| SORT flaps DESC
```

Per-episode phase timeline (mirrors the UI Gantt; grouping by
`episode.status_started_at` is what keeps flapping runs distinct):

```esql
FROM .rule-events
| WHERE type == "alert" AND rule.id == "RULE_ID"
| STATS seg_start = MIN(@timestamp), seg_end = MAX(@timestamp)
    BY episode.id, episode.status, episode.status_started_at, group_hash
| SORT episode.status_started_at ASC
```

## Note: doubles as a regression probe

Left running long enough, `poc-flapping-spans` is exactly the heavily-flapping,
long-lived single episode the PR reviewer flagged for the `LIMIT`-without-`SORT`
clipping bug in `episode_starts_query.ts` / `episode_phases_query.ts`. If
segments start disappearing or true-starts look wrong after many cycles, that
confirms the reviewer's concern (fixing it is out of scope for this harness).

## Files

- `flapping_cpu.yaml` - kbn-data-forge config (duration-based breach/recover CPU phases on `fake_hosts`).
- `rules/*.json` - one rule body per scenario; filename is the rule id.
- `setup_rules.sh` - idempotent upsert + `--clean` / `--data-forge` / `--verify`.

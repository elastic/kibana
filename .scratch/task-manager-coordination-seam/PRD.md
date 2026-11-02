# Task Manager: coordination/execution seam (PoC)

## Alignment

Prove that Task Manager coordination (polling, claiming, discovery, claim-nudge)
can be cleanly separated from task execution behind an explicit interface, and
that the isolated coordinator runs as intended on a real serverless deployment
within today's resource envelope. The seam is the deliverable; where the
coordinator ultimately runs (worker thread, child process, UI node, dedicated
coordinator) is deliberately deferred — once the seam exists, that choice
becomes configuration, not architecture. New evidence can reopen alignment.

This is a **learning artifact**, not production code. No CI, no merge-quality
bar, no perf benchmarking.

## Motivation

Failure modes on serverless/ECH:

1. **Event-loop starvation** — heavy task execution on the BT node stalls
   polling/claiming in the same event loop; claims expire, tasks go stale,
   delays cascade.
2. **BT process death** — a misbehaving task OOMs the node, taking the
   coordinator down with it; claim churn and retry storms follow.

Today these are fused: `polling_lifecycle.ts` reads
`pool.availableCapacity()` synchronously to size each claim (`:328`) and feeds
claimed docs straight into `pool.run()` (`:495`). The claimer stamps
`ownerId: taskStore.taskManagerId` (`strategy_mget.ts:197`) — claiming node ==
executing node, by construction.

## Decisions

- **The seam is the PoC.** Extract coordination behind an interface with a
  minimal dependency set: `{esClient, logger, config, serializer}`. No imports
  from `task_pool`, `task_running`, or `CoreStart`. This is the hard,
  mechanically-enforceable gate.
- **Seam partition:**
  - Coordination (inside): `polling`, poll-loop half of `polling_lifecycle`,
    `task_claimers` (mget), `kibana_discovery_service`, `claim_nudge`.
  - Execution (outside, stays put): `task_pool`, `task_running`,
    `task_scheduling`, routes, monitoring/metrics, removed_tasks, API-key
    invalidation.
  - `TaskPool` must stay executor-side: it is not a queue but a supervisor of
    live `TaskRunner` promises (run, cancel, reap expired, measure load) —
    inherently process-local. A coordinator may keep an assignment *ledger*,
    never the pool.
- **Three-channel interface** across the seam:
  1. `capacity$` — executor → coordinator; advisory and stale by design.
     Over-claim is tolerated (pool already handles `RanOutOfCapacity`;
     leftovers are reclaimable in ~30s).
  2. Claimed task batches — coordinator → executor.
  3. Execution results/health — executor → coordinator (feeds future policy).
- **Isolation transport for the PoC: worker thread** on the BT node, channels
  over `postMessage`. Solves failure mode 1 only; failure mode 2 requires a
  child process or separate node (same seam, different transport) — explicitly
  a follow-up, informed by the PoC's memory number.
- **Rejected: claim-to-queue** (coordinator marks ready, executors CAS-take) —
  the second CAS *is* claiming; doubles ES writes for nothing.
- **Rejected: direct HTTP dispatch (UI → BT)** — ES must remain source of
  truth for crash recovery, so HTTP can only ever be a nudge (which
  `claim_nudge` already provides via ES); discovery service stores
  `{id, last_seen}`, not routable addresses; push inverts backpressure;
  delivery semantics require building a message queue next to a database.
- **Deferred, unlocked by the seam:**
  - (a) Push/assignment: a coordinator (e.g. on UI node or dedicated) stamps
    `ownerId: <bt-node-id>`, executors watch for their mail via ES. Coherent
    but a distributed scheduler — needs remote capacity ledger + reassignment
    on executor death.
  - Global punishment/scheduling policy: quarantine poison pills, global
    per-type rate limits, tenant fairness. Policy inputs (`attempts`,
    `status`, `startedAt`, `retryAt`) already live in task docs; a single
    coordinator makes policy globally consistent. Richest health signal
    (event-loop delay, memory) lives executor-side and must be reported via
    channel 3.

## Non-goals

- Production-ready code, green CI, mergeable branch.
- Performance benchmarking / baseline-vs-seam statistical comparison.
- UI-node or dedicated-coordinator prototype.
- Punishment-policy implementation.
- Solving failure mode 2 (process death) in this PoC.

## Feedback Loop

- Tests: TM `jest_integration` suite run locally as a development tool (not a
  gate) while untangling `polling_lifecycle`.
- Integration/E2E path: QAF serverless deployment of the PoC build.
- Visual/screen verification: none — all verification is log-based.
- Manual checks — "runs as intended" checklist, all log-verifiable on
  serverless (step zero: confirm these signals reach queryable logs; patch
  surfacing gaps first):
  1. Coordinator boots in the worker thread with its reduced dep set.
  2. Claim cycles occur on schedule (cycle logs with claim counts).
  3. A scheduled task executes end-to-end (runner log on executor side).
  4. Claim-nudge path works (sub-poll-interval pickup of a new task).
  5. No OOM/crash-loop over a ~1h soak.
  6. **Kill test (the money shot):** block the main-thread event loop with a
     pathological task; verify claim cycles continue from the worker.
- Measurement: RSS delta of BT pod with worker-thread coordinator — answers
  whether the child-process upgrade path fits 1–2GiB headroom.

## Open Questions

- QAF deploy mechanics for a custom Kibana build (assumed supported; verify).
- Exact lint/dependency-check mechanism for enforcing the coordinator's
  dependency boundary during the PoC.

## Ready To Chunk

- [x] User approved this artifact.
- [x] Feedback loop is credible.
- [ ] Open questions are either resolved or intentionally deferred to
      human-ready issues.

# Evaluation Plan — Watch Floor & Dark Watch Workers

**Date:** 2026-07-31
**Workstream:** Evaluation & Trust (PND / Project Daybreak)
**Scope:** How to evaluate the implemented Watch workers — Watch Floor (alert
triage) and Dark Watch continuous threat hunt — against the D10 architecture and
the Dark Watch MVP slice (project-daybreak#88, #74, mvp-slice.md).

---

## What was implemented (this session)

| Component | Artifact | Status |
|---|---|---|
| Dark Watch Continuous Threat Hunt Worker | `watch_dark_continuous_hunt_worker.yaml` | **New** |
| Dark Orchestrator → hunt-worker wiring | `watch_dark_orchestrator.yaml` v6 | **Modified** |
| Worker registration (id, visibility, install list) | `definitions/pnd/index.ts` | **Modified** |
| Existing: Floor orchestrator+worker, Dark domain worker, Deep, Detection, AD-continuation | (prior sessions) | Live |

The hunt Worker lifts `continuous_threat_hunt` from kibana#278905:
`elasticsearch.search` candidate selection (≤10 reports, `last_hunted_at`
cooldown) → `foreach` → `hunt_orchestrator` (Tier 1 → Tier 2, `on_hits`) →
`data.set` WorkerRun. Feedback is written by the hunt service itself
(`writeHuntFeedbackSafe`). The Black Hat findings index and Intelligence Hub
are **not** lifted, per mvp-slice.md.

---

## Evaluation layers (mapped to the Worker Testing Pyramid)

The existing `docs/daybreak-worker-testing-pyramid.md` defines L0–L6. Below is
the concrete plan for the workers on this branch, cheapest first.

### L0 — Schema / contract (deterministic, every PR)

**Goal:** the YAML parses, the step graph is valid, the WorkerRun shape
matches the canonical schema, and the allowlist renders.

- **Already passing:** `install_static.test.ts`,
  `watch_orchestrator_trigger_context_rendering.test.ts`,
  `watch_worker_skill_allowlist_rendering.test.ts`,
  `escalation_input_threading.test.ts` (pnd `managed_workflows`).
- **Add:** a render test for the new hunt Worker asserting
  (a) it parses as a valid workflow, (b) its `workerRun` carries
  `watch: watch-dark` + `workerKind: continuous_threat_hunt`, (c) its
  `skill_allowlist` is exactly `[threat-intelligence]`, (d) the candidate
  query carries the `last_hunted_at` cooldown + the IOC/behavior
  `minimum_should_match: 1` filter.
- **Gate:** `node scripts/jest --config pnd/jest.config.js --testPathPattern managed_workflows`

### L1 — Install + registration (deterministic, PR)

**Goal:** the managed workflow installs and is discoverable with the right
visibility (not a top-level Watch).

- Assert `PND_WATCH_DARK_CONTINUOUS_HUNT_WORKER_WORKFLOW_ID` is in
  `PND_WATCH_WORKFLOW_IDS` (so `installStatic` picks it up) and in
  `PND_WATCH_WORKFLOWS` with `WORKER_VISIBILITY` (empty selectors → not
  projected as a Watch).
- Assert Dark Orchestrator `version` bumped (re-install on boot).
- **Gate:** TSC + Jest on `kbn-workflows/managed`.

### L2 — Live smoke: hunt Worker runs end-to-end (live stack, on-demand)

**Goal:** against the live Kibana+ES (`:5605`/`:9208`), the hunt Worker
executes a real sweep and produces the expected side effects.

Seed ≥1 `.kibana-threat-reports` doc with an IOC and no recent
`feedback.last_hunted_at`, then trigger the Dark Orchestrator (or the Worker
directly via `workflow.execute`) and assert:

- `load_hunt_candidates` returns the seeded report (cooldown filter passes).
- `hunt_orchestrator` is invoked per report; response `status` is one of
  `tier1_and_tier2` / `tier2_only_skipped` / `no_environment_hits`.
- `.kibana-threat-reports` doc gains `feedback.last_hunted_at` (feedback
  loop works).
- `workerRun.candidateCount` ≥ 1.
- **Fail-closed checks:** empty candidate set → `candidateCount: 0`, no
  hunt calls, no error; a report whose hunt 500s → batch continues
  (`on-failure.continue: true`).

### L3 — Orchestrator gating (live stack)

**Goal:** the orchestrator invokes the hunt Worker only on the right trigger.

- Scheduled/manual run **without** `inputs.escalation` →
  `run_continuous_hunt_worker` executes.
- Escalation run from Floor (`inputs.escalation` present) → hunt Worker is
  **skipped** (an escalation is targeted, not a sweep), `run_dark_worker`
  still runs.
- Assert `emit_proposal` still fires for the domain worker output and
  `escalate_to_deep` still gates on `confidence >= escalateThreshold`.

### L4 — Outcome quality (LLM-judged, weekly)

**Goal:** the two-tier hunt produces correct, reviewable findings.

- **Tier 1 precision/recall** on a golden corpus: known-IOC report →
  environment hit found; benign report → no hit.
- **Tier 2 corroboration:** a planted suspicious-telemetry scenario yields a
  corroborated finding; a clean environment yields `no_environment_hits` or
  `tier2_skipped_reason` set honestly.
- **Cooldown correctness:** re-running within 4h yields `candidateCount: 0`
  (no duplicate hunts).
- Judge: `eis-anthropic-claude-4-6-sonnet` against a small labeled dataset.

### L5 — Chain integration (live, weekly)

**Goal:** Floor → Dark escalation still threads `investigationId` and the
hunt Worker doesn't break the chain.

- Re-run `security-watch-escalation-chain` (currently 2/2) — must stay 2/2.
- Re-run `security-deep-watch-forensics` (currently 18/21, 3 skipped) —
  must stay ≥ 18 passed, 0 failed.

---

## What is deliberately NOT evaluated (out of scope, per mvp-slice.md)

- The Black Hat findings index / Intelligence Hub panel (not lifted).
- `generalize_from_telemetry` (Detection Watch owns it).
- Detection Change Signal rule creation (Detection Watch owns the rule
  lifecycle; Dark only surfaces the gap).
- Run-as / UIAM execution identity (D1/D2 — blocked on #17942).

---

## Immediate next steps

1. Add the L0 render test for the hunt Worker (this session).
2. Boot Kibana with the new definitions; verify `installStatic` logs the new
   workflow id with no `failedIds`.
3. Run L2 smoke (seed + trigger + assert feedback).
4. Regression: full `security-watch-escalation-chain` +
   `security-deep-watch-forensics`.

# AESOP Technical Preview — 15-Minute Demo Script

> **Audience**: Engineering leads, product, stakeholders evaluating the AESOP (Autonomous Eval-driven Skill Optimization Pipeline) Technical Preview before we split PR #261057 into production slices.
>
> **Branch**: `worktree-skill-eval-platform` (feature-flag `xpack.evals.aesop.enabled: true` by default on this branch).
>
> **Goal**: Prove the end-to-end AESOP loop is demonstrable, stable, and safe to stage into production PRs.

---

## 0. Pre-flight (demo host, 5 min before)

Run these once before the audience joins. They must all pass.

```bash
# From the worktree root
cd /Users/patrykkopycinski/Projects/kibana/.claude/worktrees/skill-eval-platform

# 1. Hardening checks (must be green)
node scripts/eslint $(git diff --name-only HEAD upstream/main -- \
  'x-pack/platform/plugins/shared/evals/**/*.ts' \
  'x-pack/platform/plugins/shared/evals/**/*.tsx')  # expect: ✅ no eslint errors found
node scripts/type_check.js --project x-pack/platform/plugins/shared/evals/tsconfig.json \
  2>&1 | grep -c "x-pack/platform/plugins/shared/evals.*error TS"  # expect: 0
node scripts/jest.js --config x-pack/platform/plugins/shared/evals/jest.config.js \
  2>&1 | tail -5  # expect: 73 suites, 1022 tests, all passing

# 2. Start Kibana + ES for demo
yarn es snapshot &    # in terminal 1
yarn start --no-base-path   # in terminal 2

# 3. Seed demo data (synthtrace agent_builder scenario)
node scripts/synthtrace agent_builder --live
```

Keep three browser tabs ready:

| Tab | URL | Purpose |
|-----|-----|---------|
| A | `http://localhost:5601/app/management/kibana/evals` | Runs list (anchor) |
| B | `http://localhost:5601/app/management/kibana/evals/monitoring` | Live monitoring |
| C | `http://localhost:5601/app/management/kibana/evals/aesop/skills/proposed` | AESOP queue |

---

## 1. Opening & framing (0:00 – 1:30)

> "Today I'll walk you through AESOP — the Autonomous Eval-driven Skill Optimization Pipeline we've been building under PR #261057. It's a closed loop: watch production traffic → find weak skills → propose better versions → evaluate them → promote the winners. Everything I show ships behind `xpack.evals.aesop.enabled` as a Technical Preview, so we can stage it without touching default behaviour."

Key points to land:

- This is the **first time** the whole loop runs end-to-end in-Kibana.
- Every new surface is marked **"Technical preview"** (EuiBetaBadge) so users know the contract may change.
- The underlying `evals` plugin (Runs / Datasets / Suites / Remotes / Tracing / Evaluators / Comparison / Monitoring) is **stable** and will ship in foundational PR A4. AESOP lives behind the flag in PR B4/B5/B6.

---

## 2. The stable evals platform (1:30 – 4:00)

**Tab A — Runs**

1. Land on `/app/management/kibana/evals`. Point out the tab bar:
   - **Runs / Datasets / Tracing / Remotes** — no badge, production-grade.
   - **AESOP / Evaluators / Comparison / Monitoring / Suites** — each carries a "Technical preview" `EuiBetaBadge`.
2. Open a recent run. Walk through:
   - Example scores table (matrix of evaluators × examples).
   - Trace waterfall drill-down (OTEL traces through LangGraph steps).
3. Click **Comparison** (badge visible). Show two runs side-by-side:
   - Pairwise review surface.
   - Composite score delta + convergence chart.
4. Click **Evaluators** (badge visible). Show:
   - Built-in evaluators (LLM-judge, ESQL, code, agent efficiency).
   - Custom evaluator creation flyout.

> "This is the stable foundation — datasets, runs, evaluators, traces, comparison. It stands on its own. AESOP just builds a feedback loop on top of it."

---

## 3. Monitoring — the signal source (4:00 – 6:00)

**Tab B — Monitoring**

1. Open `/evals/monitoring`. Note the Technical-preview badge.
2. Walk the dashboard:
   - **Rate-limit status** card (shows we back off when ES/LLM pressure rises).
   - **Skills monitored** table: Error rate, p95 latency, last seen.
   - Click into a skill (e.g. `get_service_topology`). Observe:
     - 7-day error-rate sparkline.
     - Recent failure samples (real conversation excerpts, redacted).
     - "Feedback" histogram from `@kbn/llm-batch-processing`-backed batch analyzer.

> "The monitoring view is the **input** to AESOP. Every weak skill it flags becomes a candidate for autonomous improvement."

---

## 4. AESOP — kicking off an exploration (6:00 – 9:00)

**Tab C — AESOP Proposed skills**

1. Tab into `/evals/aesop/skills/proposed`. Badge is visible.
2. Show the empty state ("No proposed skills yet") and point at the **"Run exploration"** button.
3. Click **Run exploration**. In the form:
   - Agent role: `SOC analyst`
   - Mode: `Full`
   - Exploration depth: `100`
   - Min pattern frequency: `10`
   - Scoped indices: `.alerts-security.alerts-*` (pre-filled)
4. Click **Start Exploration**. Observe:
   - Success toast "Exploration started successfully".
   - Redirect to `/aesop/exploration/<execution_id>`.

> "Under the hood this posts to `/internal/aesop/exploration/run`, which triggers a Workflows-plugin orchestrated run: failure harvest → conversation analysis → pattern detection → skill proposal → automatic online eval → promotion queue."

5. Walk through the execution detail page:
   - **Phases list** (harvest / analyze / propose / validate) with durations.
   - **Discovered patterns** and **relationships**.
   - **Skills proposed** counter climbing live (auto-refresh).

---

## 5. AESOP — reviewing a proposed skill (9:00 – 12:00)

Back to **Tab C — Proposed skills list** (or use a seeded skill if exploration is slow).

1. Sort by "Composite score". Open the top candidate.
2. In the **Skill review flyout**:
   - **Summary tab**: diff vs. current skill, evaluator selection rationale.
   - **Dataset tab**: auto-generated eval examples (from `generate_eval_dataset`).
   - **Online eval tab**: live scores across selected evaluators (`selectEvaluatorsForSkill`).
   - **Validation tab**: LLM self-critique pass output (`run_skill_validation`).
   - **Cross-eval tab**: impact analysis on other skills (from `parseCrossEvaluation`).
3. Click **Improve** once. Observe the flyout's "Improving…" spinner, then the refreshed diff:
   - New instructions.
   - New tool selection.
   - Updated composite score.
4. Click **Approve & redeploy**. Observe:
   - "Skill approved" toast.
   - `redeploy_skill` route fires; skill transitions from `proposed` → `active`.
   - Alerting-rules deploy + monitoring-dashboard deploy routes confirm wiring.

> "Every action here is gated. Reject, improve, approve — each is an explicit operator decision. AESOP proposes; humans dispose."

---

## 6. Closing the loop — regression check (12:00 – 13:30)

**Tab B — Monitoring**

1. Switch back to the monitoring dashboard for the skill we just approved.
2. Point out:
   - New "deployed" marker on the timeline.
   - Error rate / latency metrics continuing to update.
3. Then flip to **Comparison** (Tab A tab bar):
   - Show A/B compare between the pre-AESOP run and the post-AESOP run on the same dataset.
   - Composite score delta + pairwise wins.

> "The loop is closed: we monitored → explored → proposed → evaluated → promoted → re-monitored. End-to-end, inside Kibana, no external tooling."

---

## 7. Safety, scope, and split plan (13:30 – 15:00)

1. **Feature flag**
   - All of this is gated by `xpack.evals.aesop.enabled`. On this branch we default to `true` for demo; for the production split we'll flip to `false` in PR A4.
   - When disabled, the saved-object type, ILM policy, validation/online-eval services, routes, tabs, and routes all disappear.

2. **What ships where** (the PR split plan):

   | Slice | Scope | Owner(s) |
   |-------|-------|----------|
   | **A1** | `@kbn/fs` package | kibana-security |
   | **A2** | `@kbn/llm-batch-processing` | security-generative-ai |
   | **A3** | `@kbn/evals-extensions` | obs-ai-team + security-generative-ai |
   | **A4** | `evals` plugin stable core + feature flag (flag default `false`) | obs-ai-team |
   | **B1** | Monitoring dashboard | obs-ai-team |
   | **B2** | Evaluators catalog UI | obs-ai-team |
   | **B3** | Comparison / A-B dashboard + pairwise | obs-ai-team |
   | **B4** | AESOP server lib + routes, frozen zod contracts | security-generative-ai |
   | **B5** | AESOP public UI (EuiBetaBadge) | security-generative-ai |
   | **B6** | Agent Builder integration (skill_eval_section, suggestions, improvement diff) | security-generative-ai + agent-builder |
   | **Umbrella** | Convert #261057 → tracking issue or close once all slices merge | author |

3. **Known gaps we're explicitly deferring** (documented as TODOs in code):
   - `AgentBuilderContractLike` pragmatic type alias — replaced with real contract in PR B6.
   - ~420 internal `any`s in workflows/UI — deferred to follow-up cleanup PRs.
   - RBAC for AESOP admin actions (currently gated by existing `evals` feature) — refined in PR B4.

4. **Validation status at demo time**
   - ESLint on changed evals files: ✅ clean.
   - Type check (evals plugin scope): ✅ 0 errors.
   - Jest (evals plugin): ✅ 73 suites, 1022 tests.
   - Upstream-only type errors (ES|QL USER_AGENT, EUI v114): tracked separately, unrelated to this PR.

---

## 8. Q&A prompts (backup)

Expect questions like:

- **"What if the LLM proposes a skill that breaks another skill?"**
  → Show `parseCrossEvaluation` output in the review flyout — cross-skill impact is surfaced before approval. We won't auto-promote on a red cross-eval.

- **"How do we roll back a bad promotion?"**
  → Each promotion is recorded as a workflow execution. `redeploy_skill` supports rolling back to a previous revision (stored as a Saved Object). Demo tab: Exploration → History.

- **"Where does the eval data live?"**
  → Elasticsearch indices managed by `ensureAesopILMPolicy` (only registered when `aesop.enabled`). Hot/warm/delete lifecycle is applied automatically.

- **"What's the perf envelope?"**
  → Circuit breaker in `workflows/circuit_breaker.ts` cuts off runaway agents. `persistent_rate_limiter.ts` throttles LLM calls. Both are covered by passing tests.

- **"Does this work with external LLM providers?"**
  → Yes — via `Actions` plugin connectors. The `ActionsClient` is the single point of control (typed now, no `any`).

---

## 9. Demo-day checklist (tick before starting)

- [ ] `xpack.evals.aesop.enabled: true` confirmed in `kibana.dev.yml` (default on this branch).
- [ ] ES + Kibana started; synthtrace `agent_builder` scenario running in `--live` mode.
- [ ] Pre-flight commands from §0 all green.
- [ ] Three browser tabs pre-loaded and logged in as a user with `evals:all`.
- [ ] Connectors (OpenAI or Gemini) configured for the LLM-backed evaluator steps.
- [ ] DevTools console closed; zoom at 100 %.
- [ ] `/aesop/skills/proposed` has at least one pre-seeded proposal in case the live exploration is slow.

---

## 10. Post-demo actions (for author)

Once sign-off is given on this demo:

1. Flip `xpack.evals.aesop.enabled` default → `false` (TODO marker in `server/config.ts`).
2. Start slicing PRs A1 → B6 per §7.2.
3. Convert #261057 into an umbrella tracking issue.
4. Close this branch once all slices have merged.

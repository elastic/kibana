---
name: cypress-ci-audit
description: >
  Automated audit and optimization of Kibana Security Solution Cypress CI suites.
  Pulls Buildkite timing data, detects weight miscalibrations, identifies imbalanced agents,
  proposes and implements fixes (weight recalibration, spec splitting/consolidation, skip detection),
  and validates changes via simulation and CI. Use periodically to keep test distribution optimal
  as teams add new tests.
---

# Cypress CI Audit Agent

Autonomously audit, rebalance, and optimize parallel Cypress test distribution across
Buildkite agents for Kibana Security Solution CI pipelines.

## When to Use

- Periodically (e.g. weekly/monthly) to catch drift as new tests are added
- After a batch of new Cypress tests lands
- When CI wall-clock time regresses past the 27-minute threshold
- When agent spread (max - min time) exceeds 5 minutes
- When you want to evaluate reducing agent count to save CI cost

## Prerequisites

- Buildkite MCP tools available (`user-buildkite-read-only-toolsets`)
- Access to the Kibana repo with Security Solution Cypress tests
- The `cypress-ci-optimizer` skill is also available for deep-dive reference

## Architecture

### Suites and Their Runners

| Suite | Spec Base Dir | Runner | Buildkite Config | Stack Sharing |
|-------|--------------|--------|-----------------|---------------|
| **Defend Workflows ESS** | `x-pack/solutions/security/plugins/security_solution/public/management/cypress/e2e` | `scripts/run_cypress/parallel.ts` | `defend_workflows.yml` | `CYPRESS_SHARE_STACKS=true` |
| **Defend Workflows Serverless** | Same | `scripts/run_cypress/parallel_serverless.ts` | `defend_workflows.yml` | No |
| **SSC ESS** (Investigations, Det.Eng, etc.) | `x-pack/solutions/security/test/security_solution_cypress/cypress/e2e` | `runner.ts` via FTR | Per-suite `.yml` | No |
| **SSC Serverless** | Same | `serverless_config.ts` | Per-suite `.yml` | No |

All DW paths are relative to `x-pack/solutions/security/plugins/security_solution/`.
All SSC paths are relative to `x-pack/solutions/security/test/`.

### Key Files

| File | Role |
|------|------|
| `scripts/run_cypress/utils.ts` | Generic load balancer, weight estimation, skip detection, config grouping |
| `scripts/run_cypress/dw_config.ts` | DW-specific `LoadBalancerConfig` — **template for new suite configs** |
| `scripts/run_cypress/parallel.ts` | DW ESS runner — uses `DW_LOAD_BALANCER_CONFIG` |
| `scripts/run_cypress/parallel_serverless.ts` | DW Serverless runner |
| `scripts/junit_transformer/lib.ts` | JUnit XML post-processor |
| `.buildkite/pipelines/pull_request/security_solution/*.yml` | Buildkite pipeline definitions |

### LoadBalancerConfig Interface

```typescript
interface LoadBalancerConfig {
  dynamicRunnerWeights: Record<string, number>;
  filteredRunnerWeights: Record<string, number>;
  setupCostWeight: number;
  perSpecOverhead: number;
  minSpecWeight: number;
}
```

### Cost Function

```
agentCost = totalWeight + numSpecs × perSpecOverhead + numConfigs × setupCostWeight + newConfigPenalty
```

Where `newConfigPenalty = setupCostWeight` if the spec's config is new to the agent, else 0.

---

## Full Audit Workflow

Execute these phases in order. Each phase has a clear deliverable.

### Phase 1: Discovery — Identify Target Suite

**Goal:** Determine which suite(s) to audit and gather metadata.

1. **List all Cypress Buildkite pipeline configs:**
   ```
   Glob: .buildkite/pipelines/pull_request/security_solution/*.yml
   ```

2. **For each pipeline, extract:**
   - Suite name and label
   - Current `parallelism` value (ESS and Serverless)
   - Machine type and timeout
   - Whether `CYPRESS_SHARE_STACKS=true` is set in the shell script

3. **Determine the spec base directory** by reading the shell script for each suite.

4. **Count specs per suite:**
   Walk the spec directory, count `.cy.ts` files, split by `@ess` / `@serverless` tags.

**Deliverable:** Table of suites with spec counts and current agent allocations.

### Phase 2: Pull CI Timing Data

**Goal:** Get actual per-agent wall-clock times from the latest successful CI build.

1. **Find the latest build** using Buildkite MCP:
   ```
   list_builds: org_slug=elastic, pipeline_slug=kibana-pull-request, state=passed, per_page=5
   ```
   Pick the most recent build on `main` or the target branch.

2. **Get build details with jobs:**
   ```
   get_build: build_number=<N>, detail_level=full, job_state=passed
   ```

3. **Extract job data** for the target suite:
   - Filter jobs by name (e.g. "Defend Workflows Cypress Tests")
   - For each agent: `parallel_group_index`, `started_at`, `finished_at` → duration in minutes

4. **Compute suite-level metrics:**
   - Makespan (max agent time)
   - Spread (max - min agent time)
   - Average agent time
   - Empty agents (agents with 0 specs)
   - Total agent-minutes consumed

5. **Pull per-spec runtimes** from the fastest AND slowest agents:
   ```
   search_logs: pattern="Cypress run ENV for file|Duration:", limit=100
   ```
   Parse the log to build a `(spec_file, duration_seconds)` mapping.

**IMPORTANT:** Pull from at least 6-8 agents (including the 3 fastest and 3 slowest) to get a
representative sample of per-spec runtimes across all categories.

**Deliverable:** Per-agent timing table + per-spec runtime dataset (20+ spec samples minimum).

### Phase 3: Weight Calibration Analysis

**Goal:** Compare estimated weights vs actual runtimes to find miscalibrations.

1. **Calculate the baseline conversion factor:**
   Find specs with accurate weights (weight closely tracks runtime) to establish
   `WEIGHT_TO_SEC` — seconds of actual runtime per weight unit.
   Good candidates: artifact RBAC specs (`*_rbac_siem_v*.cy.ts`) which have explicit
   dynamic runner weights. Typical baseline: **18-20 seconds per weight unit**.

2. **For each spec with timing data, compute:**
   - Current estimated weight (from `getSpecFileWeight`)
   - Actual runtime in seconds
   - Ideal weight = `actual_runtime / WEIGHT_TO_SEC`
   - Error factor = `ideal_weight / current_weight`

3. **Group by category and identify patterns:**

   | Category | Typical Error | Root Cause |
   |----------|--------------|------------|
   | Mocked RBAC | 0.5-0.8x (overweighted) | Dynamic runners generate many tests but mocks are fast |
   | Navigation | 3-5x underweighted | Few `it()` calls but real page navigations are slow |
   | Tamper protection | 4-6x underweighted | Few tests but real Fleet agent operations |
   | Response actions | 5-8x underweighted | Real Endpoint operations take 4-7 min |
   | Regular RBAC | ~1.2x (close) | Dynamic runners accurate for non-mocked |
   | Artifact CRUD | 2-3x underweighted | Setup overhead dominates for small test count |

4. **Produce a weight recalibration table:**
   ```
   Category          | Current Weight | Actual Runtime | Proposed Weight | Factor
   ------------------|---------------|---------------|----------------|-------
   Navigation specs  |             4 |        5:20   |             17 |  4.3x
   Tamper protection |             3 |        4:45   |             15 |  5.1x
   ```

**Deliverable:** Weight calibration table with proposed changes and impact factor.

### Phase 4: Simulation

**Goal:** Validate proposed changes produce better distribution before any code changes.

Use the simulation script from `cypress-ci-optimizer/simulation.md` adapted with the
proposed weights. Run an **agent sweep** from `(current_agents - 10)` to `current_agents`
to find the minimum agent count that stays under the 27-minute threshold.

Key simulation parameters:
- `STACK_SETUP_SEC = 240` (4 minutes for ES + Kibana + Fleet)
- `CYPRESS_BOOT_SEC = 30` (per-spec Cypress startup)
- `WEIGHT_TO_SEC` = from Phase 3 baseline

**Deliverable:** Agent sweep table showing makespan and spread for current vs proposed weights.

### Phase 5: Implement Changes

Based on the analysis, implement one or more of these optimization techniques:

#### 5a. Weight Recalibration

Update `dw_config.ts` (or create a new `<suite>_config.ts`):

```typescript
const DYNAMIC_RUNNER_WEIGHTS: Record<string, number> = {
  createRbacPoliciesExistSuite: 19,   // calibrated from CI runtime
  createNavigationEssSuite: 17,       // navigation is slow despite few it() calls
  // ...
};
```

For specs where the runner-based weight doesn't reflect reality, add per-spec overrides
using `FILTERED_RUNNER_WEIGHTS` or introduce a `specWeightOverrides` map in the config.

#### 5b. Spec Splitting

**When to split:**
- Single spec takes >8 min (blocks the critical path)
- RBAC spec iterates all 5 SIEM versions in one file
- Dynamic runner generates 20+ tests in a single describe

**How to split RBAC by SIEM version:**
Create separate files `<name>_siem.cy.ts`, `<name>_siem_v2.cy.ts`, etc.
Each uses `siemVersionFilter` to run only its version.

#### 5c. Consolidating Tiny Specs

**When to consolidate:**
- Multiple 1-2 test specs with the same `ftrConfig`
- Each incurs full Cypress boot + stack setup overhead
- Total agent-minutes wasted > 3 min

Merge related tiny specs into a single file to amortize setup cost.

#### 5d. Skip Detection

Verify `isSkipped()` catches all skipped specs. Check for:
- `describe.skip()` at any nesting level
- All `it()` calls being `it.skip()`
- Dynamic runners inside `describe.skip` blocks

If new dynamic runner functions have been added, ensure they're in the
`dynamicRunnerWeights` map so the AST walker recognizes them.

#### 5e. Agent Count Adjustment

If simulation shows the suite can finish under 27 min with fewer agents:
- Update `parallelism` in the Buildkite `.yml` file
- **Never reduce by more than 20% at once** — validate with one CI run first
- Keep a buffer: if simulation shows 19 agents → 26.8 min, set to 20 agents

**Deliverable:** Code changes to config files and/or spec files.

### Phase 6: Validate in CI

After pushing changes:

1. Trigger CI (for draft PRs: `gh pr comment <N> --repo elastic/kibana --body "/ci"`)
2. Monitor with `ci-watcher` subagent
3. After completion, pull timing data again (repeat Phase 2)
4. Verify:
   - [ ] Makespan ≤ 27 min for all suites
   - [ ] Spread < 5 min between fastest and slowest agents
   - [ ] No JUnit errors from empty XML files
   - [ ] No empty agents (0 specs assigned)
   - [ ] No test failures introduced by changes

**Deliverable:** Before/after comparison showing improvement.

---

## Checklist: Things That Go Wrong

| Problem | Symptom | Fix |
|---------|---------|-----|
| `del()` fails on JUnit XML | "Cannot delete files outside CWD" | Add `{ force: true }` to `del()` calls in `junit_transformer/lib.ts` |
| Skipped specs waste CI time | Agent runs 5-min setup for a `describe.skip` spec | Enhance `isSkipped()` AST walker, ensure dynamic runner names are in config |
| `setupCostWeight` too high | Agents with unique configs get 1-2 specs and finish in 8 min | Reduce to 15-20; never exceed 40 |
| `setupCostWeight` too low | Too many configs per agent, setup dominates | Increase to 20-30 |
| Weight overestimation (mocked tests) | Mocked RBAC specs predicted at 13 min, actually take 6 min | Reduce dynamic runner weight for mocked suites |
| Weight underestimation (slow ops) | Navigation/tamper specs predicted at 1 min, actually take 5 min | Add per-spec weight overrides or increase dynamic runner weight |
| New dynamic runners not tracked | New helper function generates tests invisibly | Add to `dynamicRunnerWeights` in the suite config |
| `parallel_serverless.ts` not optimized | Serverless still uses naive round-robin | Pass a `LoadBalancerConfig` to serverless runner |
| Config fragmentation (many unique ftrConfigs) | Each agent needs multiple stack setups | Consider if configs can be consolidated; reduce `setupCostWeight` |

---

## Per-Suite Audit Notes

### Defend Workflows (DW)

**Config:** `dw_config.ts`, `parallel.ts`, `defend_workflows.yml`
**Stack sharing:** Yes (`CYPRESS_SHARE_STACKS=true`)
**ESS agents:** 24, **SL agents:** 16
**Key dynamic runners:** `getArtifactMockedDataTests` (40), `getArtifactTabsTests` (12),
`createRbacPoliciesExistSuite` (27→19*), `createRbacHostsExistSuite` (27→19*),
`createRbacEmptyStateSuite` (27→19*), `createNavigationEssSuite` (4→17*)

*Values marked with → are empirically calibrated from CI runtimes.

**Known categories needing per-spec overrides:**
- Tamper protection: 3 tests, 4-5 min real agent ops → weight ~15
- Response actions: 3 tests, 5-7 min real endpoint ops → weight ~18-22
- Artifact CRUD: 3-5 tests, 2-3 min → weight ~7-9

### SSC Suites (Investigations, Det.Eng, Rule Mgmt, etc.)

**Config:** No `LoadBalancerConfig` yet — uses default `orderSpecFilesForLoadBalance`
**Stack sharing:** No
**Location:** `x-pack/solutions/security/test/security_solution_cypress/`

**To optimize:**
1. Create `<suite>_config.ts` in `scripts/run_cypress/`
2. Identify dynamic runners in that suite's test helpers
3. Wire config into the suite's runner
4. Or: simply adjust `parallelism` based on actual CI timing analysis

### Osquery

**Config:** Separate pipeline, simpler specs
**Key insight from analysis:** Can likely reduce from 8 → 3 agents (saving 5 per env)
because specs are simple, mostly default-config, and current provisioning is excessive.

---

## Runtime Constants Reference

These are empirically measured from CI and should be re-validated periodically:

| Constant | Value | Meaning |
|----------|-------|---------|
| `STACK_SETUP_SEC` | 240 (4 min) | Time to start ES + Kibana + Fleet server |
| `CYPRESS_BOOT_SEC` | 30 | Per-spec Cypress browser init overhead |
| `WEIGHT_TO_SEC` | 18.5 | Seconds of actual runtime per weight unit (DW baseline) |

---

## Creating a New Suite Config

To optimize a suite that doesn't have a `LoadBalancerConfig` yet:

1. **Audit first** (Phases 1-3 above) to understand the current state
2. Create `<suite>_config.ts` modeled after `dw_config.ts`
3. Identify all dynamic runner functions:
   ```bash
   # Find functions that generate it() calls
   rg "function\s+\w+.*describe|function\s+\w+.*it\(" <test-helpers-dir>
   ```
4. Count their generated `it()` calls → `dynamicRunnerWeights`
5. Start with: `setupCostWeight: 20`, `perSpecOverhead: 3`, `minSpecWeight: 3`
6. Import config in the suite's runner and pass to `utils` functions
7. Simulate, validate, iterate

---

## Quick Reference: Buildkite MCP Commands

```
# List recent builds
list_builds: org_slug=elastic, pipeline_slug=kibana-pull-request, state=passed, per_page=5

# Get build with job details
get_build: build_number=<N>, detail_level=full, job_state=passed

# Search job logs for per-spec timing
search_logs: build_number=<N>, job_id=<JOB_ID>, pattern="Cypress run ENV for file|Duration:", limit=100

# Search for spec distribution
search_logs: build_number=<N>, job_id=<JOB_ID>, pattern="Resolved spec files after", limit=10
```

---

## Output Template

After completing an audit, produce a summary in this format:

```markdown
## Cypress CI Audit Report — <Suite Name> — <Date>

### Current State
| Metric | ESS | Serverless |
|--------|-----|-----------|
| Agents | | |
| Active Specs | | |
| Makespan | | |
| Spread | | |
| Total Agent-Minutes | | |

### Weight Miscalibrations Found
| Category | Specs | Current Wt | Actual Runtime | Proposed Wt | Factor |
|----------|-------|-----------|---------------|-------------|--------|

### Agent Sweep (Proposed Weights)
| Agents | Current Wts Makespan | Proposed Wts Makespan |
|--------|---------------------|----------------------|

### Recommendations
1. ...
2. ...

### Estimated Savings
- Agents: X → Y (save Z)
- Makespan: X min → Y min
- Monthly agent-minutes saved: ~N
```

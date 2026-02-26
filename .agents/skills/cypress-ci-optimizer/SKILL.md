---
name: cypress-ci-optimizer
description: Analyze and optimize Kibana Security Solution Cypress CI performance. Use when investigating slow Cypress builds, load balancing imbalances, spec splitting, weight tuning, or reducing CI wall-clock time for parallel Cypress test suites.
---

# Cypress CI Optimizer

Optimize parallel Cypress test distribution in Kibana's Security Solution CI pipeline.

> **See also:** The [`cypress-ci-audit`](../cypress-ci-audit/SKILL.md) skill provides a
> comprehensive end-to-end audit workflow that uses these techniques to autonomously
> analyze, rebalance, and optimize any Cypress suite. Use `cypress-ci-audit` for
> periodic reviews; use this skill for targeted deep-dives on specific parameters.

## Architecture Overview

### Key Files

| File | Role |
|------|------|
| `scripts/run_cypress/utils.ts` | Generic load balancer, weight estimation, skip detection, config grouping |
| `scripts/run_cypress/dw_config.ts` | DW-specific `LoadBalancerConfig` (weights, costs) — **template for new suites** |
| `scripts/run_cypress/parallel.ts` | ESS runner — uses `DW_LOAD_BALANCER_CONFIG` |
| `scripts/run_cypress/parallel_serverless.ts` | Serverless runner — no LB config (simpler distribution) |
| `scripts/junit_transformer/lib.ts` | JUnit XML post-processor (uses `del(path, { force: true })`) |
| `.buildkite/pipelines/pull_request/security_solution/defend_workflows.yml` | Buildkite step config (parallelism, machine type, timeout) |

All paths relative to `x-pack/solutions/security/plugins/security_solution/`.

### Load Balancer Config Interface

```typescript
interface LoadBalancerConfig {
  dynamicRunnerWeights: Record<string, number>; // function name → approx test count
  filteredRunnerWeights: Record<string, number>; // reduced weights when spec filters by SIEM version
  setupCostWeight: number;    // penalty for each distinct ftrConfig on an agent
  perSpecOverhead: number;    // per-spec Cypress boot overhead
  minSpecWeight: number;      // floor weight for any spec
}
```

### Cost Function (Greedy Bin-Packing)

```
agentCost = totalWeight + numSpecs × perSpecOverhead + numConfigs × setupCostWeight + newConfigPenalty
```

Where `newConfigPenalty = setupCostWeight` if the spec's config is new to the agent, else 0.

## Optimization Workflow

### Step 1: Pull CI Timing Data

Use Buildkite MCP tools or `ci-watcher` subagent to get per-agent completion times.

```
Key metrics to extract:
- Per-agent wall-clock time (from step start to finish)
- Which specs ran on each agent
- Number of specs per agent
- Any stack setup/teardown time visible in logs
```

### Step 2: Identify Imbalances

Compare the fastest vs slowest agent. Target: **spread < 3 min** for the suite.

Common imbalance root causes:

| Symptom | Root Cause | Fix |
|---------|-----------|-----|
| Agent with 1-2 specs finishes in 8 min while others take 25 min | `setupCostWeight` too high — unique-config specs get isolated | Reduce `setupCostWeight` |
| Agent with many light specs takes longer than one with few heavy specs | Dynamic runner weights underestimated | Update `dynamicRunnerWeights` |
| Agents running skipped specs waste 5+ min on setup | `isSkipped()` doesn't detect nested `describe.skip` | Already fixed — verify AST walker catches it |
| One agent gets all the heavy RBAC specs | Specs not split by SIEM version | Split spec file |

### Step 3: Simulate Before Deploying

**Always** simulate distribution changes locally before pushing to CI. Use this Python template:

For detailed simulation script, see [simulation.md](simulation.md).

### Step 4: Tune Parameters

Parameter tuning guidelines based on DW optimization experience:

| Parameter | DW Value | Guidance |
|-----------|----------|----------|
| `setupCostWeight` | 20 | Start at 20. If agents with unique configs are underloaded, decrease. If too many configs per agent, increase. **Never exceed 40.** |
| `perSpecOverhead` | 3 | ~20-30s of Cypress boot per spec. Rarely needs changing. |
| `minSpecWeight` | 3 | Floor for 1-test specs. Prevents them from being treated as "free". |
| `dynamicRunnerWeights` | varies | Count actual `it()` calls generated at runtime. Use `grep -c 'it(' ` on the runner source. |
| `filteredRunnerWeights` | varies | When a spec uses `siemVersionFilter`, divide full weight by number of SIEM versions. |

### Step 5: Validate in CI

After pushing, monitor with `ci-watcher`. Check:
- [ ] All agents finish within 3 min of each other
- [ ] No agent has 0 specs (wasted parallelism)
- [ ] No JUnit errors from empty XML files
- [ ] Total suite time meets target threshold

## Optimization Techniques Reference

### 1. Config-Aware Load Balancing

Enable with `CYPRESS_SHARE_STACKS=true`. Uses `retrieveIntegrationsConfigAware()` which groups specs by `ftrConfig` to minimize redundant stack setups.

When to use: When specs have different `ftrConfig` values (license, kbnServerArgs, productTypes).

### 2. Spec Splitting

Split large spec files to enable finer-grained distribution.

**When to split:**
- Spec takes >5 min alone
- Spec uses dynamic runners generating 20+ tests
- RBAC specs that iterate over SIEM versions

**How to split RBAC specs by SIEM version:**
```typescript
// Original: trusted_apps_rbac.cy.ts (runs all 5 SIEM versions)
// Split into: trusted_apps_rbac_siem.cy.ts, trusted_apps_rbac_siem_v2.cy.ts, etc.
// Each file uses siemVersionFilter to run only its version
```

### 3. Consolidating Tiny Specs

Merge 1-2 test specs that share the same `ftrConfig` to reduce per-spec overhead.

**When to consolidate:**
- Multiple specs with 1-3 tests each
- All share the same ftrConfig (same stack requirements)
- Tests are functionally related

### 4. Skip Detection

`isSkipped()` in `utils.ts` uses AST parsing to detect:
- Top-level `describe.skip()`
- Nested `describe.skip()` containing all `it()` calls
- Dynamic runners (from `dynamicRunnerWeights` keys) inside skip blocks

Skipped specs are excluded from scheduling entirely, saving ~5 min of stack setup per spec.

### 5. Weight Calibration

Weight ≠ runtime. Weights approximate relative test count. When weights diverge from actual runtimes:

1. Check if dynamic runners are undercounted (update `dynamicRunnerWeights`)
2. Check if some tests are inherently slow (e.g., real endpoint tests vs mocked)
3. Consider adding a per-spec weight override map for outliers

## Adding a New Suite's Config

To optimize a new Cypress suite (not DW):

1. Create `<suite>_config.ts` next to `dw_config.ts`
2. Identify dynamic runner functions in the suite's test helpers
3. Count their generated `it()` calls → populate `dynamicRunnerWeights`
4. Start with: `setupCostWeight: 20`, `perSpecOverhead: 3`, `minSpecWeight: 3`
5. Import the config in the suite's `parallel.ts` and pass to `utils` functions
6. Run simulation, adjust weights, validate in CI

## Pitfalls & Lessons Learned

- **`del()` needs `{ force: true }`** — JUnit transformer deletes XML files that may be outside CWD. Without `force`, it throws "Cannot delete files/directories outside the current working directory".
- **`setupCostWeight` = 40 was too aggressive** — caused agents with 2 configs to appear "full" at estimated runtime 101 while having only 15 weight of tests. Reduced to 20 for optimal spread.
- **The cost function formula is correct** — don't remove `configs.size × setupCostWeight` from the formula. The issue is always the parameter VALUES, not the formula structure.
- **Simulate before deploying** — a 1-parameter change (setupCostWeight 40→20) reduced runtime spread from 46 to 5 in simulation. Always verify with the Python simulator.
- **`parallel_serverless.ts` doesn't use LB config** — it calls `orderSpecFilesForLoadBalance()` and `retrieveIntegrations()` without config. To optimize serverless, pass a config or keep it simple with round-robin.

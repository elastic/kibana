# Weight Calibration Reference

Empirical CI runtime data for calibrating spec weights. This data was collected from
build 401746 on the `dw-cypress-optimization` branch and should be periodically refreshed.

## Baseline: Weight-to-Seconds Ratio

The baseline conversion factor is derived from specs whose weights accurately predict runtime.

**Best calibration sources:** Artifact RBAC specs (`*_rbac_siem_v*.cy.ts`) with dynamic
runner weights, because their test count is known and stable.

| Spec | Weight | Runtime | Sec/Weight |
|------|--------|---------|-----------|
| `artifact_tabs_host_isolation_exceptions.cy.ts` | 12 | 3:11 (191s) | 15.9 |
| `artifact_tabs_blocklist.cy.ts` | 12 | 3:13 (193s) | 16.1 |
| `endpoint_exceptions_rbac_siem_v4.cy.ts` | 8 | 2:59 (179s) | 22.4 |
| `trusted_apps_rbac_siem_v2.cy.ts` | 8 | 3:05 (185s) | 23.1 |

**Baseline: ~18.5 seconds per weight unit** (average of accurately-weighted specs)

## Category Runtimes

### Mocked RBAC (overweighted)

These specs use `createRbacPoliciesExistSuite` / `createRbacHostsExistSuite` / `createRbacEmptyStateSuite`
which generate 27 `it()` calls each. But because they test against mocked data, each test runs
in ~13 seconds instead of the ~30s assumed by weight formula.

| Spec | Current Wt | Runtime | Ideal Wt | Factor |
|------|-----------|---------|----------|--------|
| `endpoints_rbac_mocked_data_hosts_exist_siem_v4.cy.ts` | 27 | 5:54 (354s) | 19 | 0.7x |
| `endpoints_rbac_mocked_data_hosts_exist_siem_v1.cy.ts` | 27 | 5:50 (350s) | 19 | 0.7x |
| `endpoints_rbac_mocked_data_hosts_exist_siem_v3.cy.ts` | 27 | 5:44 (344s) | 19 | 0.7x |

**Recommendation:** `createRbacPoliciesExistSuite` / `createRbacHostsExistSuite` / `createRbacEmptyStateSuite` → weight 19

### Navigation (severely underweighted)

Navigation specs have only 4 `it()` calls but each test involves full page navigations
with complex UI rendering that takes ~80 seconds per test.

| Spec | Current Wt | Runtime | Ideal Wt | Factor |
|------|-----------|---------|----------|--------|
| `navigation_ess_siem_v5.cy.ts` | 4 | 5:35 (335s) | 18 | 4.3x |
| `navigation_ess_siem_v4.cy.ts` | 4 | 5:29 (329s) | 18 | 4.3x |
| `navigation_ess_siem_v2.cy.ts` | 4 | 4:52 (292s) | 16 | 3.9x |

**Recommendation:** `createNavigationEssSuite` → weight 17

### Tamper Protection (severely underweighted)

Tamper protection specs have 3 tests each but involve real Fleet agent operations
(enroll, unenroll, policy changes) that take 4-5 minutes total.

| Spec | Current Wt | Runtime | Ideal Wt | Factor |
|------|-----------|---------|----------|--------|
| `uninstall_from_host_changing_disabled_to_enabled.cy.ts` | 3 | 5:18 (318s) | 17 | 5.7x |
| `unenroll_from_fleet_changing_disabled_to_enabled.cy.ts` | 3 | 4:25 (265s) | 14 | 4.8x |
| `unenroll_from_fleet_changing_enabled_to_enabled.cy.ts` | 3 | 4:06 (246s) | 13 | 4.4x |

**Recommendation:** Per-spec override → weight 15

### Response Actions (severely underweighted)

Response action specs interact with real Endpoint agents, making them the slowest
per-test category.

| Spec | Current Wt | Runtime | Ideal Wt | Factor |
|------|-----------|---------|----------|--------|
| `endpoint_operations.cy.ts` | 3 | 6:52 (412s) | 22 | 7.4x |
| `alerts_response_console.cy.ts` | 3 | 5:39 (339s) | 18 | 6.1x |
| `no_license.cy.ts` | 3 | 1:59 (119s) | 6 | 2.1x |

**Recommendation:** Per-spec overrides: `endpoint_operations` → 22, `alerts_response_console` → 18

### Regular RBAC (well-calibrated)

| Spec | Current Wt | Runtime | Ideal Wt | Factor |
|------|-----------|---------|----------|--------|
| `blocklist_rbac_siem.cy.ts` | 8 | 3:07 (187s) | 10 | 1.3x |
| `blocklist_rbac_siem_v2.cy.ts` | 8 | 3:07 (187s) | 10 | 1.3x |
| `trusted_apps_rbac_siem_v2.cy.ts` | 8 | 3:05 (185s) | 10 | 1.3x |
| `event_filters_rbac_siem_v4.cy.ts` | 8 | 3:03 (183s) | 10 | 1.2x |
| `host_isolation_exceptions_rbac_siem_v4.cy.ts` | 8 | 2:54 (174s) | 9 | 1.2x |
| `blocklist_rbac_siem_v4.cy.ts` | 8 | 2:52 (172s) | 9 | 1.2x |
| `event_filters_rbac_siem_v2.cy.ts` | 8 | 2:50 (170s) | 9 | 1.1x |

**Status:** Close to accurate. Could increase to 10 for slight improvement.

### Artifact CRUD (moderately underweighted)

| Spec | Current Wt | Runtime | Ideal Wt | Factor |
|------|-----------|---------|----------|--------|
| `blocklist.cy.ts` | 3 | 2:49 (169s) | 9 | 3.0x |
| `insights.cy.ts` | 3 | 2:27 (147s) | 8 | 2.7x |
| `trusted_apps.cy.ts` | 3 | 2:06 (126s) | 7 | 2.3x |

**Recommendation:** Per-spec overrides: weight 7-9

## DW Proposed Weight Overrides

Based on the data above, these per-spec overrides would significantly improve load balancing:

```typescript
const SPEC_WEIGHT_OVERRIDES: Record<string, number> = {
  // Tamper protection: real agent ops, 4-5 min despite 3 tests
  'unenroll_agent_from_fleet.cy.ts': 15,
  'uninstall_agent_from_host.cy.ts': 15,
  'unenroll_agent_from_fleet_changing_policy_from_disabled_to_enabled.cy.ts': 15,
  'unenroll_agent_from_fleet_changing_policy_from_enabled_to_disabled.cy.ts': 15,
  'unenroll_agent_from_fleet_changing_policy_from_enabled_to_enabled.cy.ts': 15,
  'uninstall_agent_from_host_changing_policy_from_disabled_to_enabled.cy.ts': 15,
  'uninstall_agent_from_host_changing_policy_from_enabled_to_disabled.cy.ts': 15,
  'uninstall_agent_from_host_changing_policy_from_enabled_to_enabled.cy.ts': 15,

  // Response actions: real endpoint ops, 5-7 min
  'endpoint_operations.cy.ts': 22,
  'alerts_response_console.cy.ts': 18,

  // Artifact CRUD: 2-3 min
  'blocklist.cy.ts': 9,
  'trusted_apps.cy.ts': 7,
  'event_filters.cy.ts': 8,
  'host_isolation_exceptions.cy.ts': 8,
  'endpoint_exceptions.cy.ts': 8,
  'insights.cy.ts': 8,
  'endpoints.cy.ts': 8,
};
```

## Simulation Impact

With calibrated dynamic runner weights AND per-spec overrides:

| Suite | Current Agents | Min Agents (< 27 min) | Savings |
|-------|---------------|----------------------|---------|
| DW ESS | 24 | 19 | 5 agents |
| DW SL | 16 | 15 | 1 agent |

## Re-Calibration Cadence

Re-run this analysis when:
- More than 10 new specs are added to a suite
- CI makespan regresses by > 3 minutes
- Agent spread exceeds 5 minutes
- A new dynamic runner function is introduced
- After any major refactoring of test helpers

Data source: Pull from the most recent green build on `main` using Buildkite MCP tools.

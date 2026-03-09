# Analysis Script Reference

Python script for comprehensive spec analysis: weight estimation, config grouping,
skip detection, and load balancer simulation. Adapt the `SUITE_CONFIG` section for each suite.

## Usage

```bash
cd <kibana-root>
python3 audit_cypress_suite.py
```

## Template

```python
#!/usr/bin/env python3
"""
Cypress CI Suite Auditor
Analyzes spec files, estimates weights, simulates load balancer distribution,
and sweeps agent counts to find optimal parallelism.
"""

import os
import re
import json
from dataclasses import dataclass, field
from typing import Optional

# ============================================================================
# SUITE CONFIG — adapt for each suite
# ============================================================================

SUITE_CONFIG = {
    "name": "Defend Workflows",
    "spec_base": "x-pack/solutions/security/plugins/security_solution/public/management/cypress/e2e",
    "ess_agents": 24,
    "sl_agents": 16,
    "target_makespan_min": 27,

    "dynamic_runner_weights": {
        "getArtifactMockedDataTests": 40,
        "getArtifactTabsTests": 12,
        "createRbacPoliciesExistSuite": 27,
        "createRbacHostsExistSuite": 27,
        "createRbacEmptyStateSuite": 27,
        "createNavigationEssSuite": 4,
    },
    "filtered_runner_weights": {
        "getArtifactMockedDataTests": 8,
    },

    # Per-spec weight overrides (filename → weight)
    # Use when test count doesn't reflect actual runtime
    "spec_weight_overrides": {},

    # Load balancer parameters
    "setup_cost_weight": 20,
    "per_spec_overhead": 3,
    "min_spec_weight": 3,
}

# Runtime constants (empirically measured)
STACK_SETUP_SEC = 240      # 4 min for ES + Kibana + Fleet
CYPRESS_BOOT_SEC = 30      # Per-spec browser init
WEIGHT_TO_SEC = 18.5       # Seconds per weight unit (calibrate from CI)


# ============================================================================
# Core functions
# ============================================================================

@dataclass
class Spec:
    file: str
    path: str
    weight: int
    config_key: str
    category: str = ""
    actual_runtime_sec: Optional[int] = None


@dataclass
class Agent:
    specs: list = field(default_factory=list)
    weight: int = 0
    configs: set = field(default_factory=set)


def get_weight(content: str, filename: str, cfg: dict) -> int:
    """Estimate spec weight from file content."""
    overrides = cfg.get("spec_weight_overrides", {})
    if filename in overrides:
        return overrides[filename]

    it_count = len(re.findall(r'\bit\s*\(', content))
    it_skip = len(re.findall(r'\bit\.skip\s*\(', content))
    total = it_count + it_skip

    has_siem = 'siemVersionFilter' in content
    dw = cfg["dynamic_runner_weights"]
    fw = cfg["filtered_runner_weights"]

    for runner, weight in dw.items():
        occ = sum(
            1 for line in content.split('\n')
            if 'import' not in line and f'{runner}(' in line
        )
        if occ > 0:
            eff = fw.get(runner, weight) if has_siem else weight
            total += occ * eff

    return max(total, cfg["min_spec_weight"])


def get_config_key(content: str) -> str:
    """Extract ftrConfig key from file content."""
    m = re.search(r'ftrConfig:\s*\{([^}]*)\}', content, re.DOTALL)
    if m:
        inner = re.sub(r'//.*', '', m.group(1)).strip()
        if inner:
            return inner[:80]
    return "default"


def is_skipped(content: str, cfg: dict) -> bool:
    """Check if spec is effectively skipped (all tests in skip blocks)."""
    # Quick top-level check
    for line in content.split('\n'):
        s = line.strip()
        if s.startswith(('import ', '//', '/*', '*', 'const ', 'let ', 'type ', 'export ')) or s == '':
            continue
        if 'describe.skip(' in s:
            return True
        break

    # TODO: For full AST-level skip detection, use the TypeScript isSkipped()
    # function in utils.ts. This Python version only catches top-level skips.
    return False


def categorize_spec(filename: str, content: str) -> str:
    """Assign a category to a spec for analysis grouping."""
    if 'rbac_mocked_data' in filename:
        return "mocked_rbac"
    if 'navigation_' in filename:
        return "navigation"
    if 'tamper_protection' in filename or 'switching_policies' in filename:
        return "tamper_protection"
    if 'response_actions' in filename or 'response_console' in filename:
        return "response_actions"
    if '_rbac_' in filename:
        return "rbac"
    if 'artifact_tabs' in filename:
        return "artifact_tabs"
    if any(x in filename for x in ['blocklist.cy', 'trusted_apps.cy', 'event_filters.cy',
                                     'host_isolation_exceptions.cy', 'endpoint_exceptions.cy']):
        return "artifacts"
    return "other"


def collect_specs(cfg: dict, tag: str) -> list:
    """Collect non-skipped spec files matching a tag."""
    specs = []
    base = cfg["spec_base"]

    for root, dirs, files in os.walk(base):
        for f in files:
            if not f.endswith('.cy.ts'):
                continue
            path = os.path.join(root, f)
            content = open(path).read()
            if tag not in content or is_skipped(content, cfg):
                continue
            specs.append(Spec(
                file=f,
                path=os.path.relpath(path, base),
                weight=get_weight(content, f, cfg),
                config_key=get_config_key(content),
                category=categorize_spec(f, content),
            ))

    specs.sort(key=lambda s: (-s.weight, s.file))
    return specs


def simulate(specs: list, n_agents: int, cfg: dict) -> tuple:
    """Simulate greedy bin-packing distribution. Returns (runtimes_min, agents)."""
    scw = cfg["setup_cost_weight"]
    pso = cfg["per_spec_overhead"]
    agents = [Agent() for _ in range(n_agents)]

    for spec in sorted(specs, key=lambda s: (-s.weight, s.file)):
        best_idx = 0
        best_cost = float('inf')
        for i, a in enumerate(agents):
            nc = len(a.configs) + (0 if spec.config_key in a.configs else 1)
            cost = a.weight + (len(a.specs) + 1) * pso + nc * scw
            if cost < best_cost:
                best_cost = cost
                best_idx = i

        agents[best_idx].specs.append(spec)
        agents[best_idx].weight += spec.weight
        agents[best_idx].configs.add(spec.config_key)

    runtimes = []
    for a in agents:
        if not a.specs:
            runtimes.append(0)
        else:
            rt = (
                len(a.configs) * STACK_SETUP_SEC
                + sum(s.weight * WEIGHT_TO_SEC for s in a.specs)
                + len(a.specs) * CYPRESS_BOOT_SEC
            ) / 60
            runtimes.append(rt)

    return runtimes, agents


def agent_sweep(specs: list, cfg: dict, current_n: int, target_min: float = 27) -> dict:
    """Sweep agent counts to find minimum under target makespan."""
    results = {}
    min_n = current_n

    for n in range(max(3, current_n - 12), current_n + 1):
        rts, ags = simulate(specs, n, cfg)
        makespan = max(rts) if rts else 999
        non_zero = [r for r in rts if r > 0]
        spread = (max(non_zero) - min(non_zero)) if non_zero else 0

        results[n] = {
            "makespan": makespan,
            "spread": spread,
            "empty_agents": sum(1 for r in rts if r == 0),
        }

        if makespan <= target_min and min_n == current_n:
            min_n = n

    return {"sweep": results, "min_agents": min_n, "savings": current_n - min_n}


# ============================================================================
# Main audit
# ============================================================================

def run_audit(cfg: dict):
    print(f"=" * 80)
    print(f"CYPRESS CI AUDIT: {cfg['name']}")
    print(f"=" * 80)

    for env_key, tag, current_n in [("ESS", "@ess", cfg["ess_agents"]),
                                      ("SL", "@serverless", cfg["sl_agents"])]:
        specs = collect_specs(cfg, tag)
        total_weight = sum(s.weight for s in specs)
        configs = set(s.config_key for s in specs)

        print(f"\n{'─' * 60}")
        print(f"{cfg['name']} {env_key}: {len(specs)} specs, {len(configs)} configs, total weight {total_weight}")
        print(f"Current agents: {current_n}")
        print(f"{'─' * 60}")

        # Category breakdown
        cats = {}
        for s in specs:
            cats.setdefault(s.category, []).append(s)
        print(f"\n  Category breakdown:")
        for cat in sorted(cats.keys()):
            items = cats[cat]
            avg_w = sum(s.weight for s in items) / len(items)
            print(f"    {cat:<25} {len(items):>3} specs, avg weight {avg_w:>5.1f}")

        # Config distribution
        config_counts = {}
        for s in specs:
            label = "default" if s.config_key == "default" else s.config_key[:40]
            config_counts[label] = config_counts.get(label, 0) + 1
        print(f"\n  Config distribution:")
        for label, count in sorted(config_counts.items(), key=lambda x: -x[1]):
            print(f"    {label:<42} {count:>3} specs ({count/len(specs)*100:.0f}%)")

        # Top 10 heaviest specs
        print(f"\n  Top 10 heaviest specs:")
        for s in specs[:10]:
            print(f"    w={s.weight:>3}  [{s.category:<20}] {s.file}")

        # Tiny specs (weight <= 3, default config)
        tiny = [s for s in specs if s.weight <= cfg["min_spec_weight"] and s.config_key == "default"]
        if tiny:
            print(f"\n  Consolidation candidates (weight <= {cfg['min_spec_weight']}, default config): {len(tiny)} specs")

        # Skipped specs
        skipped_count = 0
        base = cfg["spec_base"]
        for root, dirs, files in os.walk(base):
            for f in files:
                if not f.endswith('.cy.ts'):
                    continue
                path = os.path.join(root, f)
                content = open(path).read()
                if tag in content and is_skipped(content, cfg):
                    skipped_count += 1
        if skipped_count:
            print(f"\n  Filtered out (skipped): {skipped_count} specs")

        # Current distribution simulation
        rts, ags = simulate(specs, current_n, cfg)
        non_zero = [r for r in rts if r > 0]
        print(f"\n  Current distribution ({current_n} agents):")
        print(f"    Makespan: {max(non_zero):.1f} min")
        print(f"    Spread: {max(non_zero) - min(non_zero):.1f} min")
        print(f"    Empty agents: {sum(1 for r in rts if r == 0)}")

        # Agent sweep
        target = cfg["target_makespan_min"]
        result = agent_sweep(specs, cfg, current_n, target)
        print(f"\n  Agent sweep (target < {target} min):")
        print(f"    {'Agents':>6} | {'Makespan':>10} | {'Spread':>8} | {'Empty':>5}")
        print(f"    {'-'*6}-+-{'-'*10}-+-{'-'*8}-+-{'-'*5}")
        for n in sorted(result["sweep"].keys()):
            d = result["sweep"][n]
            marker = " ★" if n == result["min_agents"] and n < current_n else ""
            print(f"    {n:>6} | {d['makespan']:>8.1f}m | {d['spread']:>6.1f}m | {d['empty_agents']:>5}{marker}")

        if result["savings"] > 0:
            print(f"\n  ★ SAVINGS: {current_n} → {result['min_agents']} agents (save {result['savings']})")
        else:
            print(f"\n  → Cannot reduce agents below {target} min threshold")


if __name__ == "__main__":
    run_audit(SUITE_CONFIG)
```

## Adapting for Other Suites

To audit a different suite (e.g. Investigations):

1. Change `spec_base` to the correct directory
2. Set `dynamic_runner_weights` to empty `{}` if no dynamic runners exist
3. Set `filtered_runner_weights` to empty `{}`
4. Set `ess_agents` and `sl_agents` from the Buildkite `.yml`
5. Adjust `categorize_spec()` for that suite's file naming patterns

## Interpreting Results

| Metric | Good | Needs Attention | Action |
|--------|------|-----------------|--------|
| Spread | < 3 min | > 5 min | Recalibrate weights or tune `setupCostWeight` |
| Empty agents | 0 | > 0 | Reduce `parallelism` |
| Error factor | 0.8-1.2x | > 2x or < 0.5x | Per-spec weight override needed |
| Consolidation candidates | < 10 | > 20 | Merge related tiny specs |
| Makespan vs target | < 27 min | > 27 min | Increase agents or optimize weights |

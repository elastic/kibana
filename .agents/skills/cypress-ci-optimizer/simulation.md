# Simulation Script Reference

Use this Python script to simulate load balancer distribution before deploying changes.
Adapt the constants and spec directory to the target suite.

## Usage

```bash
cd <kibana-root>
python3 simulate_lb.py
```

## Template

```python
import os, re

# === CONFIGURE THESE FOR YOUR SUITE ===
SPEC_BASE = "x-pack/solutions/security/plugins/security_solution/public/management/cypress/e2e"
N_AGENTS_ESS = 24
N_AGENTS_SL = 16

DYNAMIC_RUNNER_WEIGHTS = {
    "getArtifactMockedDataTests": 40,
    "getArtifactTabsTests": 12,
    "createRbacPoliciesExistSuite": 27,
    "createRbacHostsExistSuite": 27,
    "createRbacEmptyStateSuite": 27,
    "createNavigationEssSuite": 4,
}
FILTERED_RUNNER_WEIGHTS = {"getArtifactMockedDataTests": 8}
DYNAMIC_RUNNER_NAMES = set(DYNAMIC_RUNNER_WEIGHTS.keys())

SETUP_COST_WEIGHT = 20  # tune this
PER_SPEC_OVERHEAD = 3
MIN_SPEC_WEIGHT = 3
# === END CONFIG ===


def get_weight(content):
    """Estimate spec weight from file content."""
    it_matches = len(re.findall(r'\bit\s*\(', content))
    it_skip = len(re.findall(r'\bit\.skip\s*\(', content))
    test_count = it_matches + it_skip
    has_siem_filter = 'siemVersionFilter' in content

    for runner, weight in DYNAMIC_RUNNER_WEIGHTS.items():
        pattern = runner + '('
        lines = content.split('\n')
        call_occurrences = sum(
            1 for line in lines if 'import' not in line and pattern in line
        )
        if call_occurrences > 0:
            eff_weight = (
                FILTERED_RUNNER_WEIGHTS.get(runner, weight)
                if has_siem_filter
                else weight
            )
            test_count += call_occurrences * eff_weight

    return max(test_count, MIN_SPEC_WEIGHT)


def get_config_key(content):
    """Extract ftrConfig key from file content."""
    m = re.search(r'ftrConfig:\s*\{([^}]*)\}', content, re.DOTALL)
    if m:
        inner = re.sub(r'//.*', '', m.group(1)).strip()
        if inner:
            return inner[:80]
    return "default"


def is_top_level_skip(content):
    """Quick check for top-level describe.skip."""
    for line in content.split('\n'):
        s = line.strip()
        if s.startswith(('import ', '//', '/*', '*', 'const ', 'let ', 'type ')) or s == '':
            continue
        return 'describe.skip(' in s
    return False


def collect_specs(base_dir, tag_filter='@ess'):
    """Collect non-skipped spec files matching a tag."""
    specs = []
    for root, dirs, files in os.walk(base_dir):
        for f in files:
            if not f.endswith('.cy.ts'):
                continue
            path = os.path.join(root, f)
            content = open(path).read()
            if tag_filter not in content or is_top_level_skip(content):
                continue
            specs.append({
                'path': os.path.relpath(path, base_dir),
                'weight': get_weight(content),
                'config_key': get_config_key(content),
            })
    specs.sort(key=lambda x: (-x['weight'], x['path']))
    return specs


def simulate(specs, n_agents, setup_cost):
    """Simulate greedy bin-packing distribution."""
    agents = [{'paths': [], 'total_weight': 0, 'configs': set()} for _ in range(n_agents)]

    for spec in specs:
        best_idx = 0
        best_cost = float('inf')
        for i in range(n_agents):
            a = agents[i]
            new_configs = len(a['configs']) + (0 if spec['config_key'] in a['configs'] else 1)
            cost = (
                a['total_weight']
                + (len(a['paths']) + 1) * PER_SPEC_OVERHEAD
                + new_configs * setup_cost
            )
            if cost < best_cost:
                best_cost = cost
                best_idx = i
        agents[best_idx]['paths'].append(spec['path'])
        agents[best_idx]['total_weight'] += spec['weight']
        agents[best_idx]['configs'].add(spec['config_key'])

    # Print results
    runtimes = []
    for a in agents:
        if not a['paths']:
            runtimes.append(0)
        else:
            runtimes.append(
                a['total_weight']
                + len(a['configs']) * setup_cost
                + len(a['paths']) * PER_SPEC_OVERHEAD
            )

    non_zero = [r for r in runtimes if r > 0]
    print(f"Agents: {n_agents}, Setup cost: {setup_cost}")
    print(f"  Specs: {sum(len(a['paths']) for a in agents)}")
    print(f"  Runtime range: {min(non_zero)}-{max(non_zero)} (spread: {max(non_zero)-min(non_zero)})")
    print(f"  Makespan: {max(non_zero)}")
    print(f"  Empty agents: {sum(1 for r in runtimes if r == 0)}")
    print()

    for i, (a, rt) in enumerate(zip(agents, runtimes)):
        names = [os.path.basename(p) for p in a['paths']]
        print(f"  #{i:2d}  sp={len(a['paths']):2d} wt={a['total_weight']:3d} "
              f"cf={len(a['configs'])} rt={rt:3d}  {', '.join(names[:3])}"
              f"{'...' if len(names) > 3 else ''}")

    return agents, runtimes


# Run simulation
ess_specs = collect_specs(SPEC_BASE, '@ess')
print(f"=== ESS ({len(ess_specs)} specs) ===")
for sc in [40, 20, 10]:
    simulate(ess_specs, N_AGENTS_ESS, sc)
    print("---")

sl_specs = collect_specs(SPEC_BASE, '@serverless')
print(f"\n=== Serverless ({len(sl_specs)} specs) ===")
for sc in [40, 20, 10]:
    simulate(sl_specs, N_AGENTS_SL, sc)
    print("---")
```

## Interpreting Results

| Metric | Good | Bad | Action |
|--------|------|-----|--------|
| Runtime spread | < 10 | > 30 | Tune `setupCostWeight` |
| Empty agents | 0 | > 2 | Reduce parallelism or increase specs |
| Makespan | Decreasing | Increasing | Revert parameter change |
| Max specs/agent | < 8 | > 12 | Weight calibration needed |

## Sweep Strategy

Test `setupCostWeight` values: 5, 10, 20, 40. Pick the value with:
1. Lowest runtime spread (tightest balance)
2. Zero empty agents
3. Lowest makespan

In practice, 20 is optimal for most suites with 1-3 unique configs among 80+ specs.

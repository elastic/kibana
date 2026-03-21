## Why

IDE skills in `agent-skills-sandbox` and Agent Builder skills in Kibana are diverging as the
agentic-interface-program kicks off across teams. We need a single source of truth for intent
and requirements so parity can be enforced while still allowing each target to use its native
tools, evaluation frameworks, and packaging.

## What Changes

- Introduce a canonical skill definition format that captures requirements, inputs/outputs,
  and behavioral guarantees across targets.
- Add target-specific generators that translate the canonical spec into platform-native
  artifacts (sandbox scripts + cursor-plugin-evals, Kibana Agent Builder + kbn/evals).
- Define an eval parity adapter that compiles shared expectations into the appropriate
  evaluation framework for each target.
- Add governance and CI enforcement to detect parity drift and require alignment for changes.

## Capabilities

### New Capabilities
- `canonical-skill-spec`: A canonical, platform-agnostic skill definition with requirements,
  IO contracts, and behavioral guarantees.
- `target-generators`: Generator contracts for producing sandbox and Kibana-native artifacts
  from the canonical spec.
- `eval-parity-adapters`: Cross-target evaluation mapping from canonical expectations to
  cursor-plugin-evals and kbn/evals.
- `parity-governance`: Ownership, review, and CI rules that enforce parity and prevent drift.

### Modified Capabilities
- (none)

## Impact

- Repos: `elastic-skill-compiler`, `elastic/agent-skills-sandbox`, `elastic/kibana`.
- Tooling: cursor-plugin-evals integration for sandbox skills; kbn/evals for Agent Builder.
- CI: new parity validation steps and generator-based artifact updates.
- Docs: guidance for skill owners on defining canonical requirements and target constraints.

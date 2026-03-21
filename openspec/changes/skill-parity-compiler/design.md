## Context

Today IDE skills live in `agent-skills-sandbox` and Agent Builder skills live in Kibana, and they are
already diverging across teams. Each target uses different tooling, evaluation frameworks, and
packaging conventions (scripts + cursor-plugin-evals vs Kibana-native tools + kbn/evals). The
agentic-interface-program increases parallel work across teams, which makes drift inevitable
without a shared source of truth and automated enforcement.

This design proposes a canonical skill definition and a set of target-specific generators plus
evaluation adapters so each target remains native while parity is guaranteed by shared requirements.

## Goals / Non-Goals

**Goals:**
- Define a canonical, platform-agnostic skill spec that captures requirements, IO contracts, and
  behavioral guarantees.
- Provide target generators that emit native artifacts for:
  - `agent-skills-sandbox` (scripts + cursor-plugin-evals)
  - Kibana Agent Builder (native tools + kbn/evals)
- Add parity enforcement and CI checks to detect drift.
- Keep target implementations idiomatic and native to each ecosystem.

**Non-Goals:**
- Forcing identical implementations or shared runtime tooling between targets.
- Replacing existing eval frameworks; we adapt to them.
- Solving cross-platform packaging for every future IDE/agent platform in v1.
- Full round-trip editing between targets; canonical spec is the source of truth.

## Decisions

- **Canonical spec is the single source of truth.**
  - *Rationale:* Skills are diverging because each target owns its own definition. A canonical spec
    ensures requirements are shared while implementations remain native.
  - *Alternatives considered:* Keep separate specs with periodic manual sync. Rejected due to
    repeated drift and lack of enforcement.

- **Generators are target-specific and enforce native constraints.**
  - *Rationale:* Sandbox skills should remain script-first with cursor-plugin-evals, and Kibana
    skills should remain tool-first with kbn/evals. Generators enforce the right patterns and
    prevent cross-contamination.
  - *Alternatives considered:* A single generator that emits a "lowest common denominator" artifact.
    Rejected because it would dilute native capabilities and reduce skill quality.

- **Eval parity is adapter-based, not unified.**
  - *Rationale:* cursor-plugin-evals and kbn/evals have different schemas and execution models.
    A shared expectation model can be compiled into each framework without losing native features.
  - *Alternatives considered:* Mandate one eval framework for both targets. Rejected due to
    ecosystem mismatch and existing investment.

- **User-created Agent Builder skills are exportable, not fully round-trippable.**
  - *Rationale:* Kibana users can create and edit skills in product UI. The canonical spec can
    support export for parity, but enforcing strict round-trip parity would break user workflows.
  - *Alternatives considered:* Disallow user-created skills from parity workflows. Rejected because
    it would omit a high-value skill surface from parity governance.

- **Governance is enforced via CI with ownership gates.**
  - *Rationale:* Parity requires enforcement, not just guidance. CI should validate canonical spec
    changes and ensure generated artifacts are updated.
  - *Alternatives considered:* Manual reviews only. Rejected due to scale and multi-team parallelism.

## Risks / Trade-offs

- **[Risk] Tooling adoption friction** → Provide a pilot skill and templates; align with team leads.
- **[Risk] Parity drift via manual edits** → CI checks block merges when generated outputs are stale.
- **[Risk] Eval expectation mismatch across frameworks** → Define minimal shared expectations and
  allow target-specific extensions; document divergences.
- **[Risk] Over-scoping to too many platforms** → Limit v1 to sandbox + Kibana, add others later.

## Migration Plan

1. **Pilot:** Select one existing skill with clear parity needs and implement canonical spec +
   generators + eval adapters.
2. **Bootstrap:** Add CI checks to ensure generated outputs are updated for that pilot.
3. **Expand:** Migrate additional skills in batches, prioritizing high-usage or high-drift skills.
4. **Governance:** Require canonical spec updates in PRs that modify skill behavior.
5. **Scale:** Add optional export of user-created skills from Kibana for parity visibility.

## Open Questions

- **Canonical spec location**: Keep canonical specs in `elastic-skill-compiler` under
  `skills/<skill-id>/`; targets consume generated outputs with `--check` parity validation.
- **Shared expectation schema**: Define a minimal, target-agnostic expectations model in
  `skill.requirements.yaml` (scenario name, when/then, inputs, assertions), compiled by adapters.
- **Ownership representation**: Require `owners` in canonical spec and validate a matching
  CODEOWNERS entry for each skill directory.
- **User-created skills**: Support export-only parity with a `parity: required|optional` flag;
  only `required` skills are enforced in parity CI.

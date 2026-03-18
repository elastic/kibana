# Agentic Alert Triage → User Skills Migration

This folder contains user skill definitions, a tool import checklist, and a gap RFC
to migrate the `agentic-alert-triage` workflow to user-created Agent Builder skills.

## Source material

- Workflow: `agentic-alert-triage.yaml` (from `elastic/infosec`)
- Agents: `L1-triage-agent.json`, `L2-*-agent.json`, `L2-threshold-enrichment-agent.json`, `L3-review-agent.json`
- Tools: `tools/*.json` (ES|QL tool definitions)

## Migration strategy

### Phase 0 (immediate, low risk)

- Import all ES|QL tools as user-created tools.
- Import all L1/L2/L3 agent configs as user-created skills.
- Keep the workflow for:
  - alert trigger
  - case creation and comments
  - alert status updates

### Phase 1 (skill-first orchestration)

- Introduce a top-level “orchestrator” skill that:
  - executes enrichment tools
  - runs L1 investigation + L1 triage
  - invokes L2 skills based on data source
  - calls L3 review
- Reduce the workflow to trigger + mutation wrapper.

### Phase 2 (full replacement)

- Replace workflow mutation steps with built-in tools:
  - `platform.core.cases.create`
  - `platform.core.cases.add_comment`
  - `platform.core.cases.update`
  - a Detection Engine alert status update tool (see `gap_rfc.md`)
- Remove the workflow entirely; run as a skill-only pipeline.

## Skill set produced

- L1 Investigation (skill) — Markdown output, tool-driven evidence.
- L1 Triage (skill) — JSON-only output for assessment + confidence.
- L2 domain skills — MacOS, Windows, Linux, AWS, Okta, Azure, GCP, Cloud Forensics, Source IP.
- L1 Threshold Context (skill) — one ES|QL call, compact summary.
- L3 Review (skill) — case synthesis with CEBA report.
- Triage Orchestrator (skill) — single-pass L1/L2/L3 with structured output.

## Files in this folder

- `skill_definitions/*.json` — user skill payloads for `POST /api/agent_builder/skills`.
- `agentic-alert-triage.flagged.yaml` — feature-flagged workflow with `use_orchestrator` toggle.
- `agentic-alert-triage.patched.yaml` — orchestrator-only workflow (Phase 1 only, no L2/L3 fallback).
- `import_checklist.md` — step-by-step tool + skill import checklist.
- `gap_rfc.md` — missing mutation tool requirements for full migration.

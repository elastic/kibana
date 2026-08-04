# Reviewing Context Engine pull requests

A comprehensive, **parallel persona-based** review of a PR in `elastic/kibana`, with a validation pass to strip false positives and an optional deep-analysis pass. The output is a **written review report** — this workflow does **not** post anything to GitHub. Ported from the team's PR-reviewer harness; the assets live in `prompts/`, `data/`, and `scripts/` alongside this file.

For *authoring* PRs (sizing, splitting, the body template, CODEOWNERS), see [creating-prs.md](./creating-prs.md). This file is the *reviewing* counterpart.

---

## Assets

| Kind | Path | Purpose |
|------|------|---------|
| Scripts | `scripts/init_repo.py` | Checkout the PR on a clean `upstream/main` base, fetch metadata/diff/comments to `tmp/prs/<PR>/`, `yarn kbn bootstrap` |
| | `scripts/fetch_pr_data.py` | Standalone PR data fetcher |
| Persona prompts | `prompts/persona_review.md` | Template for the standard persona agents |
| | `prompts/deepagent_review.md` | Template for the deep-analysis (`deepagent`) persona agent |
| Pipeline prompts | `prompts/aggregate_reports.md` · `prompts/validate_finding.md` · `prompts/aggregate_validations.md` | Aggregation and validation steps |
| | `prompts/deepagent_deep_analysis.md` · `prompts/deepagent_final_report.md` | Optional deep-analysis pass + styled report |
| Data | `data/personas/{correctness,security,architecture,performance,quality,validator}.md` | Persona definitions |
| | `data/deepagent/deepagent.md` + `data/deepagent/deepagent_kb/*.md` | The generic senior-engineer "deepagent" persona and its knowledge base |
| | `data/review_criteria.md` · `data/rules.md` · `data/common.md` | Review checklist, severity calibration, recurring findings |

---

## Workflow

1. **Initialize** — extract the PR number (a bare number or a `github.com/.../pull/<n>` URL), then:
   ```bash
   python .agents/skills/context-engine-team/scripts/init_repo.py <PR_NUMBER>
   ```
   Wait for it to finish (it resets to `upstream/main`, checks out the PR, writes `tmp/prs/<PR>/{metadata.json,diff.patch,...}`, and bootstraps). Read `tmp/prs/<PR>/metadata.json` and `diff.patch` to scope the review.

2. **Persona review (parallel)** — launch **one agent per persona** in a **single message**, `subagent_type: "general-purpose"`:
   - Standard personas use `prompts/persona_review.md` (fill `{PERSONA_NAME}`, `{PERSONA}`, `{PR_NUMBER}`, `{PR_TITLE}`): **correctness, security, architecture, performance, quality**.
   - The deep-analysis persona uses `prompts/deepagent_review.md`: **deepagent**.
   Each agent reads its persona file from `data/personas/<persona>.md` (or the deepagent persona + KB) and writes a report to `tmp/prs/<PR>/reports/<persona>.md`.

3. **Aggregate reports** — one agent with `prompts/aggregate_reports.md` reads every file in `tmp/prs/<PR>/reports/` → merges + dedupes into `tmp/prs/<PR>/final_report.md`.

4. **Validate findings (parallel)** — count findings; launch ≤10 validator agents (`prompts/validate_finding.md`, persona `data/personas/validator.md`), each verifying its `{FINDINGS_BLOCK}` against the actual code to kill false positives.

5. **Aggregate validations** — one agent with `prompts/aggregate_validations.md` → `tmp/prs/<PR>/final_report_validated.md`. **This validated report is the primary deliverable.**

6. **Deep analysis (optional, recommended for large/architectural PRs)** — one agent with `prompts/deepagent_deep_analysis.md`: reads the deepagent persona + KB, the validated report, and the **full** changed files, then surfaces NEW findings → `tmp/prs/<PR>/reports/additional_deepagent.md`.

7. **Deep-analysis report (optional)** — `prompts/deepagent_final_report.md` combines validated + additional findings into a styled `tmp/prs/<PR>/reports/deepagent_report.md`.

8. **Present the report to the user** — show `tmp/prs/<PR>/final_report_validated.md` (and `reports/deepagent_report.md` if step 7 ran). **Stop here.** Posting the review to GitHub (comments, approve/request-changes, inline comments) is deliberately **out of scope** for this workflow — the human takes the report and decides what to do with it.

---

## Context Engine review criteria (add to every review)

Beyond the generic `data/review_criteria.md` and `data/rules.md`, a Context Engine PR MUST be checked against the team's load-bearing invariants (see [conventions.md](./conventions.md)). These apply to **any** Context Engine workstream — sources, KI-creation automations, the setup skill, the retrieval skill, traces, and the feedback loop:

- **Dependency direction** — `context_engine` must not import `agentBuilder` (server or browser); integration only via the `agent_builder_platform` inversion. No cross-bundle value imports (`import type` only). No project-ref on `@kbn/workflows-management-plugin`.
- **Feature flag** — new routes 404 when the feature setting is off; new HTTP routes are `access: experimental`.
- **Versioned routes & privileges** — HTTP routes are versioned and gated by the appropriate privilege.
- **Storage** — when a storage adapter exposes a reset/clear, it uses raw `esClient.deleteByQuery` scoped strictly to the target id (never a broad delete or index drop).
- **i18n** — all strings under `xpack.contextEngine.*`.
- **Verification** — the PR ran Node-24 `type_check` + `eslint` + `i18n_check` + unit tests (see [creating-prs.md](./creating-prs.md)).

If the PR adds **Task Manager** tasks, also check: task runners return `{ state: {...} }` (never `{}`); no direct writes to system indices; `runSoon` read lazily off the start contract.

When reviewing **feedback-loop** code specifically (currently a PoC in PR #282241, not yet merged), also check the domain vocabulary — cases / patterns / improvements; flag any "issue" used for the domain concept.

## Reviewer boundaries (who must approve)

- `x-pack/platform/plugins/shared/context_engine/**` → `@elastic/context-eng`.
- `agent_builder_platform/**`, `agent_builder` tracing, `allow_lists.ts`, `@kbn/llm-trace-waterfall` → `@elastic/workchat-eng`.

Call out in the review report when a PR touches a boundary that needs another team's sign-off.

---

## Notes & assumptions

- `init_repo.py` assumes an `upstream` remote pointing at `elastic/kibana` and runs `yarn kbn bootstrap`; ensure [setup.md](./setup.md) prerequisites (Node 24, `gh`, bootstrap) are met.
- Output lives under `tmp/prs/<PR>/` (git-ignored).
- The `deepagent` persona is a generic senior-engineer reviewer profile + knowledge base; tune `data/deepagent/deepagent_kb/*.md` to the team's standards over time.

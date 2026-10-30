---
id: security-evals
description: Reviews Security eval suites for coverage, evaluator soundness, and weekly CI readiness
apply_to:
  - "x-pack/solutions/security/packages/kbn-evals-suite-*/**"
  - "x-pack/solutions/security/packages/kbn-security-evals-*/**"
  - ".buildkite/pipelines/evals/evals.suites.json"
  - ".buildkite/pipelines/evals/llm_evals.yml"
can_block: false
---

# Security evals review

Review Security eval suite changes for whether they cover what the feature must do, whether their datasets and evaluators make sense, and whether they are configured to run in the weekly pipeline.

## Canonical guidance

Before reviewing, read and apply `.agents/skills/evals-review/SKILL.md`. It defines the scope, the checks (C coverage, S sense, W weekly), and the evidence gate. Follow those sections as written. Ignore any output formatting in the skill; report findings only through Libra's review tools.

For the weekly pipeline mechanics, also read `.agents/skills/evals-review/references/weekly-checklist.md`. For evaluator conventions, read `.agents/skills/evals-write-spec/references/evaluator-patterns.md`.

When the PR only touches `evals.suites.json` or `llm_evals.yml`, review only the entries for Security suites (tags include `security`, or the package lives under `x-pack/solutions/security/packages`). Ignore other suites.

Do not review backport pull requests. Use a version-prefixed title such as `[9.x]` or the `backport` label as the available backport signal.

## Libra-specific evidence addendum

In addition to the SKILL.md evidence gate:

- Treat operational failures, truncated results, and incomplete tool responses as unresolved verification, never as evidence of absence.
- Before calling `report_findings`, re-read every final `claim` and `evidence` value. Ensure code samples preserve their quotes.

## Reporting

Report only concrete findings tied to a file and line, or to a specific missing entry in a named file. Do not report lint, formatting, or naming nits.

- Use Libra's injected severity rubric to determine finding severity. The skill's check IDs are categories, not severity levels.
- Cite the matching check ID (for example C2, S3, W1) in each finding's `evidence`.
- When a suite lacks a weekly step, say that the exclusion may be intentional and ask the author to confirm.

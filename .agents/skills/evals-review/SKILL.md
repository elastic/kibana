---
name: evals-review
description: Review Security eval suite changes for coverage, evaluator soundness, and weekly CI readiness. Use when reviewing PRs that add or modify a kbn-evals-suite-* package, its datasets or evaluators, or its registration in evals.suites.json and llm_evals.yml.
---

# Evals Review

Review changes to `@kbn/evals` suites against three questions: does the suite cover what the feature must do, do its datasets and evaluators measure it soundly, and will it run weekly without manual care. Produce findings grounded in the changed files and their direct imports.

## When to Use

- PR adds or edits a Security suite package: `x-pack/solutions/security/packages/kbn-evals-suite-*` or `kbn-security-evals-*`
- PR adds or edits a dataset, task, evaluator, fixture, or Playwright config in such a package
- PR changes a Security suite entry in `.buildkite/pipelines/evals/evals.suites.json` or its step in `.buildkite/pipelines/evals/llm_evals.yml`
- PR changes the feature code a Security suite evaluates, without touching the suite

## Scope

- Changed suite files and their direct imports (spec, `src/evaluate.ts`, datasets, evaluators, `playwright.config.ts`)
- The suite's entries in `evals.suites.json` and `llm_evals.yml`
- Only Security suites. Ignore changes to other suites in the shared pipeline files
- Do not review backport PRs (version-prefixed title such as `[9.x]` or `backport` label)

## Canonical References

Read before reviewing:

- Spec and evaluator conventions: `.agents/skills/evals-write-spec/SKILL.md` and `.agents/skills/evals-write-spec/references/evaluator-patterns.md`
- Suite layout and registration: `.agents/skills/evals-create-suite/SKILL.md`
- Weekly pipeline details: `references/weekly-checklist.md` in this skill
- Evaluator and CI docs: `x-pack/platform/packages/shared/kbn-evals/README.md`

## Coverage Checks (C)

### C1: Scenario families

The dataset covers the behaviors the feature must get right, not only the happy path. For each changed or new capability, look for examples of: typical input, edge or malformed input, missing or insufficient data, and a case where the correct output is to do nothing or decline.

### C2: Negative and clean cases

The dataset includes cases whose correct result is "no finding", "benign", or "escalate". A suite where every example expects a positive result cannot detect over-reporting.

### C3: Feature change without eval change

The PR changes the behavior of an evaluated feature (prompt, tool, graph node, output schema) and neither the dataset nor an evaluator reflects it. Flag only when the feature is clearly covered by an existing Security suite.

### C4: Ground truth source

Expected outputs come from a named, reviewable source: labeled incidents, a golden snapshot, or a documented rule. Flag expected values that are only the current model output copied in.

### C5: Ambiguity is explicit

Examples with more than one defensible answer record that, through multiple accepted answers or a scoring treatment. They are not forced into a single binary label.

## Sense Checks (S)

### S1: Evaluator matches the claim

Each evaluator's name and criteria match what it computes. Flag evaluators that always return a passing score, ignore `output`, or score something other than their name implies.

### S2: Deterministic where possible

Checks that code can decide (schema validity, required fields, tool called, ID present, count in range) use `kind: 'CODE'`. Use `LLM` criteria only for subjective qualities. A suite scored only by an LLM judge has no deterministic floor.

### S3: Evaluator control

At least one test or fixture shows a deliberately broken output failing an intended evaluator. Without it, a passing score may mean the evaluator is vacuous.

### S4: Scores can fail

Thresholds, weights, and aggregation allow a bad run to fail. Flag a threshold of 0, an average that hides a failing critical dimension, or a dataset too small to move the score.

### S5: Judge and data hygiene

The judge sees only what a fair judge should: no expected answer leaking into the task input, no fixture data that contains the answer text. Dataset repetitions and concurrency in `playwright.config.ts` are intentional, and any lowered value has a stated reason.

## Weekly Checks (W)

Apply `references/weekly-checklist.md`. Summary:

### W1: Weekly step exists

A new or renamed Security suite has a step in `llm_evals.yml` with a matching `EVAL_SUITE_ID`. If a suite is intentionally not weekly, the PR or suite README says why.

### W2: Model groups consistent

`weeklyEisModelGroups` in `evals.suites.json`, when set, is a subset of the step's `EVAL_MODEL_GROUPS`.

### W3: Failure routing

The suite has a `slackChannel` so weekly failures reach an owner.

### W4: Environment and timeout

`serverConfigSet` matches what the suite needs (tracing, endpoint, entity analytics, and so on). `timeout_in_minutes` and the Playwright `timeout` fit the dataset size and model count.

### W5: Unattended run

Setup is fully scripted: no manual data load, no local-only credentials, no dependence on state left by another suite.

## Evidence Gate

- Report a finding only when you can cite the file and line, or the exact missing entry, that shows the problem.
- Treat a file you could not read or a truncated result as unresolved, never as proof that something is absent.
- Before claiming a suite lacks a weekly step, search `llm_evals.yml` for its `EVAL_SUITE_ID`. Suites can also run under a renamed or versioned id.
- Do not report style, naming, or formatting.

## Severity Guidance

Use Libra's injected severity rubric. The check IDs here are review categories, not severity levels. As calibration:

- A vacuous or always-passing evaluator, or a gate that cannot fail, is a correctness defect in the measurement.
- A missing weekly step, `slackChannel`, or consistent model groups is an operational gap. Report it, and say whether the exclusion could be intentional.
- Missing coverage for a new capability is a gap in proportion to how critical the capability is.

---
name: scout-migrate-from-ftr
description: Single entry point for migrating Kibana Functional Test Runner (FTR) tests to Scout. Plans the migration first, asks the user to review the plan, then executes it and runs the new tests. Use when migrating FTR tests to Scout, triaging FTR suites for Scout readiness, deciding UI vs API vs RTL/Jest, mapping FTR services/page objects/hooks to Scout fixtures, or splitting loadTestFile patterns.
---

# Migrate FTR to Scout

## Overview

This is the single entry point for FTR-to-Scout migrations. It runs a deliberate five-step workflow:

1. **Plan** — analyze the FTR suite end-to-end and write a migration plan document.
2. **Review gate** — stop. Surface key warnings to the user and wait for explicit approval before writing or moving any test code.
3. **Execute** — once approved, do the actual conversion.
4. **Run and iterate** — run the new tests, iterate on failures, and stop only when they pass (or the agent needs human help).
5. **Review parity & best practices** — apply the `scout-best-practices-reviewer` skill to verify migration parity and Scout best-practice compliance.

The review gate is the point of the workflow. The plan front-loads decisions (UI vs API vs RTL/Jest, parallelism, auth, Cloud portability, batching) so the user can correct course cheaply, before any code is rewritten. Do not skip it.

## Inputs

Before starting, collect or confirm:

1. **FTR directory path**: the root of the FTR suite(s) to analyze (e.g. `x-pack/platform/test/functional/apps/dashboard`).
2. **FTR config path(s)**: the config file(s) that wire these tests. Walk up from the test directory if not provided.
3. **Target Scout module root**: where the Scout tests will live. If unknown, infer from the plugin that owns the FTR tests.
4. **Deployment targets**: stateful, serverless, or both. Default: both.

## Step 1 — Plan

Follow [`references/generate-plan.md`](references/generate-plan.md) to produce a migration plan in the target Scout module root. The plan answers _what_ should change and _why_; the executor answers _how_.

If a plan already exists for this source directory and matches the current FTR contents, skip to step 2.

## Step 2 — Review gate (stop)

After writing the plan, **stop**. Do not start touching test files.

Surface the plan to the user with this message (substitute the real path):

> I generated a migration plan at `<path-to-the-plan-file>`. Please review it carefully — it captures the test-type decisions, batching, auth strategy, Cloud portability, and any flagged risks before any code changes. Reply when you're ready to proceed with the migration, or with any questions or corrections to the plan.

Then surface a short **chat-side summary** of the items the user should not miss, even if they skim the plan file:

- **Downgrades**: tests the plan reclassifies away from a UI test (to API or RTL/Jest), with one-line reasoning each.
- **`NEEDS VERIFICATION`**: anything the planner could not determine and flagged for human input.
- **Cloud portability blockers**: hardcoded paths, custom server args, or feature flags that prevent running on Elastic Cloud out-of-the-box.
- **High-impact FTR smells**: anti-patterns that change behavior on migration (try/catch swallowing, hardcoded timeouts, shared mutable state, over-privileged execution, missing cleanup). Skip cosmetic ones — only call out what would surprise the user later.

Keep the chat summary tight. The plan file is the comprehensive doc; the chat summary is the can't-miss subset.

If the user pushes back on classifications, batching, or anything else, update the plan and re-surface. Only continue once the user explicitly approves.

## Step 3 — Execute

Once the user approves, follow [`references/execute-plan.md`](references/execute-plan.md) end to end. That file owns the file placement rules, FTR-to-Scout dependency mapping, `loadTestFile` splitting, helper extraction, and typecheck instructions.

If during execution you discover the plan was wrong about a specific file's test type (e.g. the planner said "API test" but the suite actually exercises a real user flow), pause and confirm with the user before changing course.

## Step 4 — Run and iterate

Once execution is complete, run the new Scout tests and fix failures until they pass. Refer to [`docs/extend/scout/run-tests.md`](../../../docs/extend/scout/run-tests.md) for run-tests commands (local stateful and the local serverless simulation).

For faster feedback during the loop, start the test servers once and reuse them across iterations:

1. Start servers (one-time): `node scripts/scout.js start-server --stateful --serverConfigSet <configSet>` (or `--serverless <project>`).
2. Run the specs per iteration: `npx playwright test --config <playwright.config.ts> <test-file>`.

Falling back to `node scripts/scout.js run-tests` works but restarts the servers each time, which is much slower for iterative debugging.

Loop:

1. Run the migrated specs.
2. If failures, diagnose: missing cleanup, locator drift, fixture wiring, auth, tags, parallelism — usually one of these.
3. Fix and re-run.
4. Stop when all tests pass, or when you hit something that needs human judgment (genuinely unstable feature, missing source-code instrumentation, source bug). In that case, surface the blocker concisely and stop the loop.

## Step 5 — Review parity & best practices

Once the tests pass, follow the `scout-best-practices-reviewer` skill on the new and changed spec files. Provide the removed FTR test files as context so the reviewer can verify migration parity (every behavior the FTR suite covered is still covered, in the right layer).

Address `blocker` and `major` findings before considering the migration done. Surface `minor` and `nit` items for the user to triage.

## Guardrails

- **The review gate is non-negotiable**: never proceed from step 1 to step 3 without explicit user approval, even if the plan looks obviously correct.
- **Step 1 is read-only**: do not create, modify, or delete any test files during planning.
- **Loop discipline (step 4)**: don't paper over a real failure by skipping the test, loosening the assertion, or adding a sleep. Diagnose, then fix.
- **No guessing**: if you can't determine something during planning, flag it as `NEEDS VERIFICATION` rather than guessing.
- **Preserve intent**: when recommending dropping or converting a test, explain what coverage is lost and where it moves.

## References

- Step 1 (planning) workflow, inputs, output filename convention, Cloud portability questions: [`references/generate-plan.md`](references/generate-plan.md)
- Step 3 (execution) workflow: file placement, FTR-to-Scout mapping, typecheck/run: [`references/execute-plan.md`](references/execute-plan.md)
- Test-type downgrade catalog (UI vs API vs RTL/Jest): [`references/pick-correct-test-type.md`](references/pick-correct-test-type.md)
- Step 4 run commands and iteration patterns: [`docs/extend/scout/run-tests.md`](../../../docs/extend/scout/run-tests.md)

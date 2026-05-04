---
name: scout-migrate-from-ftr
description: Single entry point for migrating Kibana Functional Test Runner (FTR) tests to Scout. Plans the migration first, asks the user to review the plan, then executes it. Use when migrating FTR tests to Scout, triaging FTR suites for Scout readiness, deciding UI vs API vs RTL/Jest, mapping FTR services/page objects/hooks to Scout fixtures, or splitting loadTestFile patterns.
---

# Migrate FTR to Scout

## Overview

This is the single entry point for FTR-to-Scout migrations. It runs a deliberate three-step workflow:

1. **Plan** — analyze the FTR suite end-to-end and write a `migration_plan.md` document.
2. **Review gate** — stop. Surface the plan to the user and wait for explicit approval before writing or moving any test code.
3. **Execute** — once approved, follow [`references/migration-execution.md`](references/migration-execution.md) to do the actual conversion.

The review gate is the point of the workflow. The plan front-loads decisions (UI vs API vs RTL/Jest, parallelism, auth, server config, batching) so the user can correct course cheaply, before any code is rewritten. Do not skip it.

## Required sub-skill (planning step)

- **REQUIRED SUB-SKILL:** ftr-testing — to understand FTR structure, `loadTestFile`, configs, services, and page objects while analyzing the source suite.

The execution step's required sub-skills are listed in [`references/migration-execution.md`](references/migration-execution.md); do not load them until the user approves the plan.

## Inputs

Before starting, collect or confirm:

1. **FTR directory path**: the root of the FTR suite(s) to analyze (e.g. `x-pack/platform/test/functional/apps/dashboard`).
2. **FTR config path(s)**: the config file(s) that wire these tests (e.g. `x-pack/platform/test/functional/config.base.ts`). Walk up from the test directory if not provided.
3. **Target Scout module root**: where the Scout tests will live (e.g. `x-pack/platform/plugins/shared/dashboard`). If unknown, infer from the plugin that owns the FTR tests.
4. **Deployment targets**: stateful, serverless, or both. Default: both.

## Step 1 — Plan

Go deep on FTR analysis (read every file, understand every pattern, flag every issue). Stay at the decision level for Scout — the executor step already knows Scout's APIs, fixtures, and patterns. The planner's job is to say _what_ was found and _what_ should happen, not _how_ to implement it in Scout code.

### 1.1 Deep-read and index every FTR file

Recursively read the FTR directory. For each file, record:

- File path (relative to repo root)
- Type: `index` (has `loadTestFile`), `test` (has `describe`/`it`), `config`, `page_object`, `service`, `helper`, `archive`, or `fixture`
- Short description (one sentence: what does this file test or provide?)
- Number of `it(...)` / `describe(...)` blocks

Also read thoroughly:

- The FTR config(s): capture every `kbnTestServer.serverArgs`, `esTestCluster.serverArgs`, `security.roles`, `security.defaultRoles`, `apps`, `testFiles`, and any `services`/`pageObjects` registrations. Note config inheritance chains (which base config does it extend?).
- Every `index.ts` file that uses `loadTestFile`: capture shared `before`/`after` hooks and their setup logic. Note what state they create and whether downstream tests depend on it.
- Every FTR service and page object referenced: note which files use them, what they do, and whether they contain hidden assertions (`existOrFail`, `missingOrFail`, `expect` inside helpers).

### 1.2 Triage (what should exist, what should change)

For every test file, decide UI test / API test / unit test (RTL/Jest) / drop / defer using the criteria in [`references/test-type-downgrades.md`](references/test-type-downgrades.md). For each decision, write a one-line justification.

**File splitting**: when a single FTR file tests multiple roles or unrelated flows, recommend splitting it into separate specs (one role + one flow per file). List the proposed splits.

### 1.3 Complexity estimation

Rate each test file:

- **Simple**: single describe, ≤5 `it` blocks, no custom roles, no archives, straightforward page objects
- **Medium**: multiple describes or >5 `it` blocks, custom roles, archive loading, moderate page object usage
- **Complex**: custom server args, multi-step journeys with shared state, custom services, non-trivial data setup, FTR config overrides

Sort the full inventory by complexity (simple first).

### 1.4 Parallelism and isolation

For each test (or group), decide whether it can run in parallel or must run sequentially:

- **Parallel-safe**: all state is scoped to a Kibana space (saved objects, UI settings, index patterns), no global mutations, can share pre-ingested ES data
- **Must be sequential**: needs clean cluster state, mutates global settings, writes to shared indices, or modifies cluster-level resources (ILM policies, transforms, etc.)

Document which tests can share the same parallel pool and which need isolation. Explain why, referencing the specific state or mutation that drives the decision.

### 1.5 Test data and setup strategy

For each archive, data fixture, or setup pattern found:

1. **Inventory every archive**: path, what it contains (ES indices, Kibana saved objects, their sizes), and which test files use it
2. **Flag underused archives**: loaded by the suite but consumed by ≤1 test (candidates for removal or replacement with programmatic setup)
3. **Classify setup timing**: can data be loaded once (shared across all tests) or does each test need fresh data?
4. **Flag fresh-server tests**: tests that require a completely clean ES/Kibana state (candidates for a dedicated server config)
5. **Catalog UI settings mutations**: list every `kibanaServer.uiSettings.replace`, `uiSettings.update`, `uiSettings.delete` call, which tests use them, and whether they use replace-all semantics (wipes all settings) vs selective set
6. **Catalog repeated magic values**: archive paths, index names, time ranges, saved object IDs that appear in multiple files. These are candidates for a shared constants file.

### 1.6 Auth and roles

1. **Catalog every role**: list every FTR role from configs and test files, with the full privilege definition (ES cluster/index privileges, Kibana feature/space privileges)
2. **Note usage frequency**: how many test files use each role
3. **Flag over-privileged tests**: tests that run as `superuser` or the FTR default role when a narrower role would suffice. For each, note what privileges the test actually exercises
4. **Flag roles used widely** (≥3 files): these warrant a shared auth helper rather than inline definitions
5. **Flag special auth patterns**: `run_as`, API-key-based auth, certificate auth, or any non-standard FTR auth

The execution step will decide the specific Scout auth API to use; the plan just provides the complete role inventory with privilege definitions and usage context.

### 1.7 Reusability and abstraction audit

1. **Catalog every FTR service and page object** used by the tests: name, what it does, which files use it, and whether it contains hidden assertions (`existOrFail`, `missingOrFail`, or `expect` calls that should move to specs)
2. **Check for existing Scout equivalents**: does a matching page object or API service already exist in the Scout packages or in other plugins' `test/scout` trees? Note: exists / exists-but-in-wrong-scope / missing
3. **For missing equivalents**, recommend scope (shared Scout package vs solution-scoped vs plugin-local) based on how many plugins would benefit
4. **Catalog EUI component interactions**: list every EUI component the tests interact with directly (combo boxes, data grids, selectable lists, etc.) so the executor knows where to use Scout's EUI wrappers
5. **Flag brittle locator strategies**: `find.byCssSelector(...)`, `find.byClassName(...)`, or text-based lookups. Note where `data-test-subj` attributes are missing in source code and need to be added
6. **Flag FTR page objects with hidden assertions**: these need restructuring since page objects should return state, with assertions belonging in the spec

### 1.8 Server configuration and feature flags

1. **List every server arg** from `kbnTestServer.serverArgs` and `esTestCluster.serverArgs` across all relevant configs (including inherited base configs)
2. **Classify each arg**:
   - **Already in Scout's default server config**: no action needed
   - **Runtime-settable** (can be changed via API/UI settings without restarting servers): note which API or setting key
   - **Requires server config**: needs a custom Scout server config set. Check if a matching one already exists under `src/platform/packages/shared/kbn-scout/src/servers/configs/config_sets/`
3. **Flag experimental feature flags** and note whether they're compile-time or runtime-settable

### 1.9 Deployment targets and cloud portability

For each test group, determine where it should run:

- **Everywhere** (stateful + serverless): preferred when the feature exists in all environments
- **Stateful only**: feature/API doesn't exist in serverless
- **Serverless only**: serverless-specific behavior
- **Specific serverless projects**: e.g. security-only, observability-only

Cross-reference with existing FTR tags (`@skipServerless`, `@skipStateful`, etc.) and `.buildkite/ftr_*_configs.yml` to preserve CI coverage. Flag tests that currently only run in one environment but could run in both.

**Cloud portability**: flag FTR tests that make non-portable assumptions (hardcoded `localhost` URLs, local file paths, node topology assumptions, or cluster settings unavailable on Elastic Cloud).

### 1.10 FTR test smells

Scan every test file for patterns that need attention during migration:

| Smell | What to flag |
|-------|-------------|
| **try/catch swallowing errors** | `try { ... } catch { }` or catch blocks that don't rethrow |
| **Conditional test logic** | `if/else` inside `it()` blocks that change assertions based on runtime state |
| **Global loading indicator waits** | `waitForSelector('globalLoadingIndicator')` or similar global spinners |
| **Hardcoded timeouts** | `await new Promise(r => setTimeout(r, ...))`, `browser.sleep(...)` |
| **Shared mutable state** | Variables mutated across `it()` blocks relying on execution order |
| **Sequential journey as separate `it` blocks** | Multiple `it()` blocks that form a single user journey (shared browser state) |
| **Duplicate test cases** | Multiple `it()` blocks testing the same behavior with minor variations |
| **Missing cleanup** | Setup in `before`/`beforeEach` without corresponding teardown |
| **Retry wrappers** | `retry.try(...)`, `retry.waitFor(...)` around assertions |
| **UI-based setup/teardown** | `before`/`after` hooks that navigate pages or click through UI to create/delete test data instead of using APIs |
| **Onboarding/tour dismissals** | `browser.setLocalStorageItem(...)`, manual tour-dismiss clicks, getting-started bypasses |
| **Brittle CSS selectors** | `find.byCssSelector(...)`, `find.byClassName(...)`, text-based lookups without `data-test-subj` |
| **Over-privileged execution** | Tests running as `superuser` that don't need elevated privileges |

For each smell, note the file and relevant context.

### 1.11 Propose migration batches

Group tests into ordered batches that can be migrated independently:

1. **Batch 1**: simplest tests, no new abstractions needed, all dependencies already exist
2. **Batch 2**: medium tests, may need new page objects or auth helpers (which batch 1 didn't require)
3. **Batch N**: complex tests, require new server config sets or depend on Scout capabilities that don't exist yet

For each batch:

- List the files included
- Human involvement: `autopilot` (executor can handle end-to-end), `guided` (needs a few human decisions or source code changes), or `hands-on` (significant manual work or missing infrastructure)
- Dependencies on previous batches (e.g. "needs the page object created in batch 2")
- Any blockers (missing Scout features, missing `data-test-subj` in source code)

### 1.12 Write the migration plan

Output the plan to `migration_plan.md` in the target Scout module root, following [`references/output-template.md`](references/output-template.md) exactly.

## Step 2 — Review gate (stop)

After writing `migration_plan.md`, **stop**. Do not start touching test files. Surface the plan to the user with this message (substitute the real path):

> I generated a migration plan at `<path-to-migration_plan.md>`. Please review it carefully — it captures the test-type decisions, batching, auth strategy, and any flagged risks before any code changes. Reply when you're ready to proceed with the migration, or with any corrections to the plan.

If the user pushes back on classifications, batching, or anything else, update `migration_plan.md` and re-surface. Only continue once the user explicitly approves.

## Step 3 — Execute

Once the user approves, follow [`references/migration-execution.md`](references/migration-execution.md) end to end. That file owns the file placement rules, FTR-to-Scout dependency mapping, `loadTestFile` splitting, helper extraction, typecheck/run instructions, and the post-migration review against `scout-best-practices-reviewer`.

If during execution you discover the plan was wrong about a specific file's test type (e.g. the planner said "API test" but the suite actually exercises a real user flow), pause and confirm with the user before changing course.

## Guardrails

- **The review gate is non-negotiable**: never proceed from step 1 to step 3 without explicit user approval, even if the plan looks obviously correct.
- **Step 1 is read-only**: do not create, modify, or delete any test files during planning. Only produce the plan document.
- **Deep on FTR, light on Scout**: every FTR finding in the plan must reference concrete file paths and line numbers. Scout recommendations stay at the decision level; the executor knows the APIs.
- **No guessing**: if you can't determine something (e.g. whether a feature flag is runtime-settable), flag it as `NEEDS VERIFICATION` rather than guessing.
- **Preserve intent**: when recommending dropping or converting a test, explain what coverage is lost and where it moves.
- **Machine-parseable plan**: use consistent Markdown headings, tables, and bullet formats so step 3 (and any reviewers) can parse sections programmatically.

## References

- Plan output structure (every section, table, and bullet format): [`references/output-template.md`](references/output-template.md)
- Step 3 execution workflow (file placement, FTR-to-Scout mapping, typecheck/run, parity review): [`references/migration-execution.md`](references/migration-execution.md)
- Test-type downgrade catalog (UI vs API vs RTL/Jest criteria), used in step 1.2 and step 3: [`references/test-type-downgrades.md`](references/test-type-downgrades.md)

---
name: scout-migration-planner
description: Analyze an FTR test directory and produce a structured Markdown migration plan for Scout. Use when planning an FTR-to-Scout migration, triaging FTR suites for Scout readiness, or when asked to create a migration plan before writing code. Does not write test code; outputs an architectural blueprint for an executor skill or human.
---

# Scout Migration Planner

## Purpose

Analyze an FTR test directory end-to-end and produce a single Markdown file (`migration_plan.md`) that contains the key architectural decisions needed to migrate those tests to Scout. The planner does **not** write test code: it front-loads the analysis and high-level decisions so an executor (human or skill) can implement with minimal ambiguity.

**Key principle**: go deep on FTR analysis (read every file, understand every pattern, flag every issue). Stay at the decision level for Scout, as the executor skill already knows Scout's APIs, fixtures, and patterns. The planner's job is to say _what_ was found and _what_ should happen, not _how_ to implement it in Scout code.

## Required sub-skills

- **REQUIRED SUB-SKILL:** ftr-testing (understand FTR structure, `loadTestFile`, configs, services, page objects).

## Inputs

Before starting, collect or confirm:

1. **FTR directory path**: the root of the FTR suite(s) to analyze (e.g. `x-pack/platform/test/functional/apps/dashboard`).
2. **FTR config path(s)**: the config file(s) that wire these tests (e.g. `x-pack/platform/test/functional/config.base.ts`). Walk up from the test directory if not provided.
3. **Target Scout module root**: where the Scout tests will live (e.g. `x-pack/platform/plugins/shared/dashboard`). If unknown, infer from the plugin that owns the FTR tests.
4. **Deployment targets**: stateful, serverless, or both. Default: both.

## Core workflow

### Step 1: Deep-read and index every FTR file

Recursively read the FTR directory. For each file, record:

- File path (relative to repo root)
- Type: `index` (has `loadTestFile`), `test` (has `describe`/`it`), `config`, `page_object`, `service`, `helper`, `archive`, or `fixture`
- Short description (one sentence: what does this file test or provide?)
- Number of `it(...)` / `describe(...)` blocks

Also read thoroughly:

- The FTR config(s): capture every `kbnTestServer.serverArgs`, `esTestCluster.serverArgs`, `security.roles`, `security.defaultRoles`, `apps`, `testFiles`, and any `services`/`pageObjects` registrations. Note config inheritance chains (which base config does it extend?).
- Every `index.ts` file that uses `loadTestFile`: capture shared `before`/`after` hooks and their setup logic. Note what state they create and whether downstream tests depend on it.
- Every FTR service and page object referenced: note which files use them, what they do, and whether they contain hidden assertions (`existOrFail`, `missingOrFail`, `expect` inside helpers).

### Step 2: Triage (what should exist, what should change)

For every test file, decide:

| Decision | Criteria |
|----------|----------|
| **Keep as UI test** | Tests user flows, navigation, rendering that require a real browser and running server |
| **Convert to API test** | Asserts exact data values, validates API responses, or checks backend logic through the UI |
| **Convert to unit test (RTL/Jest)** | Tests isolated component logic: loading states, conditional rendering, table structure, tooltip content, form validation, hover behaviors |
| **Drop** | Duplicates existing coverage, tests deprecated features, or is an artifact of FTR limitations |
| **Defer** | Depends on capabilities that don't yet exist in Scout (flag explicitly what's missing) |

For each decision, write a one-line justification.

**File splitting**: when a single FTR file tests multiple roles or unrelated flows, recommend splitting it into separate specs (one role + one flow per file). List the proposed splits.

### Step 3: Complexity estimation

Rate each test file:

- **Simple**: single describe, ≤5 `it` blocks, no custom roles, no archives, straightforward page objects
- **Medium**: multiple describes or >5 `it` blocks, custom roles, archive loading, moderate page object usage
- **Complex**: custom server args, multi-step journeys with shared state, custom services, non-trivial data setup, FTR config overrides

Sort the full inventory by complexity (simple first).

### Step 4: Parallelism and isolation

For each test (or group), decide whether it can run in parallel or must run sequentially:

- **Parallel-safe**: all state is scoped to a Kibana space (saved objects, UI settings, index patterns), no global mutations, can share pre-ingested ES data
- **Must be sequential**: needs clean cluster state, mutates global settings, writes to shared indices, or modifies cluster-level resources (ILM policies, transforms, etc.)

Document which tests can share the same parallel pool and which need isolation. Explain why, referencing the specific state or mutation that drives the decision.

### Step 5: Test data and setup strategy

For each archive, data fixture, or setup pattern found:

1. **Inventory every archive**: path, what it contains (ES indices, Kibana saved objects, their sizes), and which test files use it
2. **Flag underused archives**: loaded by the suite but consumed by ≤1 test (candidates for removal or replacement with programmatic setup)
3. **Classify setup timing**: can data be loaded once (shared across all tests) or does each test need fresh data?
4. **Flag fresh-server tests**: tests that require a completely clean ES/Kibana state (candidates for a dedicated server config)
5. **Catalog UI settings mutations**: list every `kibanaServer.uiSettings.replace`, `uiSettings.update`, `uiSettings.delete` call, which tests use them, and whether they use replace-all semantics (wipes all settings) vs selective set
6. **Catalog repeated magic values**: archive paths, index names, time ranges, saved object IDs that appear in multiple files. These are candidates for a shared constants file.

### Step 6: Auth and roles

1. **Catalog every role**: list every FTR role from configs and test files, with the full privilege definition (ES cluster/index privileges, Kibana feature/space privileges)
2. **Note usage frequency**: how many test files use each role
3. **Flag over-privileged tests**: tests that run as `superuser` or the FTR default role when a narrower role would suffice. For each, note what privileges the test actually exercises
4. **Flag roles used widely** (≥3 files): these warrant a shared auth helper rather than inline definitions
5. **Flag special auth patterns**: `run_as`, API-key-based auth, certificate auth, or any non-standard FTR auth

The executor will decide the specific Scout auth API to use; the planner just provides the complete role inventory with privilege definitions and usage context.

### Step 7: Reusability and abstraction audit

1. **Catalog every FTR service and page object** used by the tests: name, what it does, which files use it, and whether it contains hidden assertions (`existOrFail`, `missingOrFail`, or `expect` calls that should move to specs)
2. **Check for existing Scout equivalents**: does a matching page object or API service already exist in the Scout packages or in other plugins' `test/scout` trees? Note: exists / exists-but-in-wrong-scope / missing
3. **For missing equivalents**, recommend scope (shared Scout package vs solution-scoped vs plugin-local) based on how many plugins would benefit
4. **Catalog EUI component interactions**: list every EUI component the tests interact with directly (combo boxes, data grids, selectable lists, etc.) so the executor knows where to use Scout's EUI wrappers
5. **Flag brittle locator strategies**: `find.byCssSelector(...)`, `find.byClassName(...)`, or text-based lookups. Note where `data-test-subj` attributes are missing in source code and need to be added
6. **Flag FTR page objects with hidden assertions**: these need restructuring since page objects should return state, with assertions belonging in the spec

### Step 8: Server configuration and feature flags

1. **List every server arg** from `kbnTestServer.serverArgs` and `esTestCluster.serverArgs` across all relevant configs (including inherited base configs)
2. **Classify each arg**:
   - **Already in Scout's default server config**: no action needed
   - **Runtime-settable** (can be changed via API/UI settings without restarting servers): note which API or setting key
   - **Requires server config**: needs a custom Scout server config set. Check if a matching one already exists under `src/platform/packages/shared/kbn-scout/src/servers/configs/config_sets/`
3. **Flag experimental feature flags** and note whether they're compile-time or runtime-settable

### Step 9: Deployment targets and cloud portability

For each test group, determine where it should run:

- **Everywhere** (stateful + serverless): preferred when the feature exists in all environments
- **Stateful only**: feature/API doesn't exist in serverless
- **Serverless only**: serverless-specific behavior
- **Specific serverless projects**: e.g. security-only, observability-only

Cross-reference with existing FTR tags (`@skipServerless`, `@skipStateful`, etc.) and `.buildkite/ftr_*_configs.yml` to preserve CI coverage. Flag tests that currently only run in one environment but could run in both.

**Cloud portability**: flag FTR tests that make non-portable assumptions (hardcoded `localhost` URLs, local file paths, node topology assumptions, or cluster settings unavailable on Elastic Cloud).

### Step 10: FTR test smells

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

### Step 11: Propose migration batches

Group tests into ordered batches that can be migrated independently:

1. **Batch 1**: simplest tests, no new abstractions needed, all dependencies already exist
2. **Batch 2**: medium tests, may need new page objects or auth helpers (which batch 1 didn't require)
3. **Batch N**: complex tests, require new server config sets or depend on Scout capabilities that don't exist yet

For each batch:

- List the files included
- Human involvement: `autopilot` (executor can handle end-to-end), `guided` (needs a few human decisions or source code changes), or `hands-on` (significant manual work or missing infrastructure)
- Dependencies on previous batches (e.g. "needs the page object created in batch 2")
- Any blockers (missing Scout features, missing `data-test-subj` in source code)

### Step 12: Write the migration plan

Output the plan to `migration_plan.md` in the target Scout module root. Use the template in [references/output_template.md](references/output_template.md).

## Guardrails

- **Read-only**: do not create, modify, or delete any test files. Only produce the plan document.
- **Deep on FTR, light on Scout**: every FTR finding must reference concrete file paths and line numbers. Scout recommendations stay at the decision level; the executor knows the APIs.
- **No guessing**: if you can't determine something (e.g. whether a feature flag is runtime-settable), flag it as `NEEDS VERIFICATION` rather than guessing.
- **Preserve intent**: when recommending dropping or converting a test, explain what coverage is lost and where it moves.
- **Machine-parseable**: use consistent Markdown headings, tables, and bullet formats so the executor skill can parse sections programmatically.

## References

- Output template with all sections and formatting: [references/output_template.md](references/output_template.md)

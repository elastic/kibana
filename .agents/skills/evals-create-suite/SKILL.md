---
name: evals-create-suite
disable-model-invocation: true
description: Scaffold a new LLM evaluation suite package with Playwright config, evaluate fixture, and package files. Use when creating a new eval suite, adding an evals package for a plugin, or setting up the boilerplate for offline LLM evaluations.
---

# Create an Eval Suite

## Overview

Eval suites live in dedicated `kbn-evals-suite-<name>` packages. Each suite is a self-contained Playwright project that uses the `evaluate` fixture from `@kbn/evals` to run LLM experiments with datasets, tasks, and evaluators.

## Inputs to Collect

- **Suite name** (kebab-case, e.g. `my-feature`)
- **Parent directory** under `x-pack/` (e.g. `x-pack/platform/packages/shared/ai-infra/` or `x-pack/solutions/security/test/`)
- **Owner** GitHub team handle (e.g. `@elastic/appex-ai-infra`)
- **Group** (`platform`, `security`, `observability`, `search`)
- **Visibility** (`shared` or `private`)
- **Whether custom fixtures are needed** (chat client, esArchiver, supertest, etc.)

## Do NOT Use `node scripts/scout.js generate`

Eval suites are **not** standard Scout test configs. The Scout generator creates `test/scout/` directories that are picked up by Scout's CI discovery glob -- this will break because evals configs use `createPlaywrightEvalsConfig` (not `createPlaywrightConfig`) and contain non-JS files (like `.text` prompt files) that Playwright cannot parse.

The Scout team has explicitly asked that eval configs live **outside** `test/scout/` directories. All eval suites place their `playwright.config.ts` in the package root.

## Directory Layout

```
kbn-evals-suite-<name>/
├── evals/
│   └── <name>.spec.ts          # evaluation spec(s)
├── src/
│   └── evaluate.ts             # re-export or extend the base evaluate fixture
├── playwright.config.ts        # MUST be in package root, NOT under test/scout/
├── package.json
├── kibana.jsonc
└── tsconfig.json
```

## File Templates

### `kibana.jsonc`

```json
{
  "type": "functional-tests",
  "id": "@kbn/evals-suite-<name>",
  "owner": "@elastic/<team>",
  "group": "<platform|security|observability|search>",
  "visibility": "<shared|private>"
}
```

`type` must be `"functional-tests"` -- not `"shared-common"` or `"plugin"`.

### `package.json`

```json
{
  "name": "@kbn/evals-suite-<name>",
  "private": true,
  "version": "1.0.0",
  "license": "Elastic License 2.0"
}
```

### `tsconfig.json`

```json
{
  "extends": "@kbn/tsconfig-base/tsconfig.json",
  "compilerOptions": {
    "outDir": "target/types",
    "types": ["jest", "node"]
  },
  "include": ["**/*.ts"],
  "exclude": ["target/**/*"],
  "kbn_references": [
    "@kbn/evals",
    "@kbn/scout"
  ]
}
```

Add any additional package refs your suite imports to `kbn_references` (e.g. `@kbn/inference-common`, `@kbn/es-archiver`).

### `playwright.config.ts`

```ts
import Path from 'path';
import { createPlaywrightEvalsConfig } from '@kbn/evals';

export default createPlaywrightEvalsConfig({
  testDir: Path.resolve(__dirname, './evals'),
  timeout: 30 * 60_000,
});
```

Options:
- `testDir` (required) -- directory containing `.spec.ts` files
- `timeout` (optional, default `5 * 60_000`) -- per-test timeout in ms
- `repetitions` (optional, default `1`) -- overridable via `EVALUATION_REPETITIONS` env var

### `src/evaluate.ts`

**Simple (no custom fixtures):**

```ts
import { evaluate } from '@kbn/evals';

export { evaluate };
```

**Extended (with custom fixtures):**

```ts
import { evaluate as base } from '@kbn/evals';
import { MyChatClient } from './chat_client';

export const evaluate = base.extend<
  {},
  { chatClient: MyChatClient }
>({
  chatClient: [
    async ({ fetch, log, connector }, use) => {
      await use(new MyChatClient(fetch, log, connector.id));
    },
    { scope: 'worker' },
  ],
});
```

## When to Extend `evaluate`

Use the base `evaluate` directly when your task calls Kibana APIs through the built-in `fetch`, `inferenceClient`, or `executorClient` fixtures.

Extend when you need:
- A **chat client** that wraps a specific Kibana API endpoint (e.g. `/api/agent_builder/converse`)
- An **`evaluateDataset` helper** that encapsulates the `runExperiment` + evaluator wiring for a consistent pattern across specs
- **`esArchiver`** for loading/unloading ES archives in setup/teardown
- **`supertest`** for direct HTTP assertions against Kibana
- **Domain-specific API clients** (e.g. `QuickstartClient`)

### Real examples

| Suite | Approach | Why |
|-------|----------|-----|
| `llm-tasks` | Base `evaluate` directly | Calls task functions in-process; custom CODE evaluators inline |
| `agent-builder` | Extended with `chatClient` + Phoenix executor | Needs HTTP chat client and external Phoenix executor |
| `security-solution-evals` | Extended with `chatClient`, `esArchiver`, `supertest`, `quickApiClient` | Domain-heavy setup: loads ES archives, uses generated API client |

## Suite Registration

Add an entry to `x-pack/platform/packages/shared/kbn-evals/evals.suites.json`:

```json
{
  "id": "<name>",
  "name": "<Human Readable Name>",
  "configPath": "<repo-relative path to playwright.config.ts>",
  "tags": ["<group>", "<name>"],
  "ciLabels": ["evals:<name>"]
}
```

Registration is optional for local dev (suites are auto-discovered from `createPlaywrightEvalsConfig` imports), but required for CI labeling and `node scripts/evals list`.

## Post-Scaffold Steps

1. Run `yarn kbn bootstrap` to register the new package.
2. Verify the suite appears: `node scripts/evals list`.
3. Create your first spec file under `evals/` (see the `evals-write-spec` skill).
4. Run locally: `node scripts/evals start --model <connector-id> --judge <connector-id>`.

## Common Mistakes

- **Placing configs under `test/scout/`** -- Scout's CI discovery will find them and crash. Keep `playwright.config.ts` in the package root.
- **Using `node scripts/scout.js generate`** -- this creates Scout test scaffolds, not eval suites. Scaffold manually using the templates above.
- Setting `type` to anything other than `"functional-tests"` in `kibana.jsonc`.
- Forgetting `@kbn/evals` in `kbn_references` -- causes TS resolution failures.
- Using `Path.join` instead of `Path.resolve` for `testDir` -- Playwright needs an absolute path.
- Creating `evals/` specs that import from `@kbn/evals` but the suite's `src/evaluate.ts` re-exports a different fixture -- always import `evaluate` from the suite's own `src/evaluate` when extending.
- Forgetting to run `yarn kbn bootstrap` after creating the package.

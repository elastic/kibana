---
navigation_title: Deployment tags
---

# Deployment tags [scout-deployment-tags]

Deployment tags declare **where a test suite is expected to run**. Add them to every `test.describe()` (or `apiTest.describe()` / `spaceTest.describe()`), then use `--grep` when running tests to target a specific environment.

Tags follow this shape:

- `@<location>-<arch>-<domain>`

Where:

- **location**: `local` or `cloud`
- **arch**: `stateful` or `serverless`
- **domain**: `classic`, `search`, `observability_complete`, `security_complete`, …

## Use the `tags` helper [scout-deployment-tags-using]

Use the `tags` helper (see the full list below) to declare where your tests should run. By default, each helper expands to **both** `@local-*` and `@cloud-*` targets:

```ts
test.describe(
  'My suite',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    // ...
  }
);
```

This is equivalent to assigning all of these tags:

- `@local-stateful-classic` (local stateful)
- `@cloud-stateful-classic` (Elastic Cloud)
- `@local-serverless-security_complete` (local serverless)
- `@cloud-serverless-security_complete` (Elastic Cloud)

To restrict a test to **local environments** only, write the tag strings explicitly:

```ts
test.describe(
  'My suite',
  { tag: ['@local-stateful-classic', '@local-serverless-security_complete'] },
  () => {
    // ...
  }
);
```

This test will only run locally (stateful classic and serverless Security complete tier), and will be skipped by Elastic Cloud pipelines.

## Pick the right tags [scout-deployment-tags-pick]

Pick the narrowest scope that's still correct for the feature under test, as every extra deployment target spins up an additional run:

| The test covers…                                 | Use                                                                                                                  |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| A platform feature that works everywhere         | [`tags.deploymentAgnostic`](#scout-deployment-tags-deployment-agnostic)                                              |
| A solution feature                               | `tags.stateful.classic` + `tags.serverless.<solution>` (use `.complete` when the solution has tiers)                 |
| Behavior specific to one serverless project tier | The explicit tier tag, e.g. `tags.serverless.security.essentials` or `tags.serverless.observability.logs_essentials` |
| Behavior that only exists on stateful            | `tags.stateful.classic` alone                                                                                        |
| Behavior that depends on FIPS mode               | The deployment tags above plus a [limit tag](#scout-deployment-tags-limit), for example `tags.limit.only.fips`       |

::::::{warning}
Don't reach for `tags.deploymentAgnostic` from a solution module. It runs your test across every solution and is expensive — use explicit per-deployment tags instead. See the [`tags.deploymentAgnostic` note](#scout-deployment-tags-deployment-agnostic).
::::::

## Common shortcuts [scout-deployment-tags-shortcuts]

### `tags.deploymentAgnostic` [scout-deployment-tags-deployment-agnostic]

Use this tag for **platform** specs that need to run across every standard deployment type. It expands to:

- `tags.stateful.all`
- `tags.serverless.search`
- `tags.serverless.observability.complete`
- `tags.serverless.security.complete`

VectorDB is excluded because it has no stateful counterpart.

::::{warning}
`tags.deploymentAgnostic` runs your test across all solutions, which is expensive. If your test lives in a solution module, use explicit targets instead (e.g. `[...tags.stateful.classic, ...tags.serverless.observability.complete]`).
::::

### Stateful [scout-deployment-tags-stateful]

| Helper                  | What it targets                                                  |
| ----------------------- | ----------------------------------------------------------------- |
| `tags.stateful.all`     | All stateful runs CI currently schedules (today: `classic`)       |
| `tags.stateful.classic` | {icon}`logo_elastic_stack` The only stateful domain CI schedules  |

::::{note}
Kibana CI only schedules stateful test runs tagged `classic` — always tag stateful coverage with
`tags.stateful.classic`, regardless of which solution view the test targets. If your test needs a
specific solution view (Search, Observability, Security) on stateful, tag it with
`tags.stateful.classic` and switch the solution view at runtime via the Kibana API,
`scoutSpace.setSolutionView()`, instead of reaching for a per-solution stateful tag.

Per-solution stateful domains (search, observability, security) aren't exposed by the
`tags.stateful` helper, and are also blocked as raw tag strings (for example `@local-stateful-search`) by
the `@kbn/eslint/scout_no_deprecated_tags` lint rule. This isn't a permanent limitation — Kibana CI
doesn't schedule those combinations yet — so the helper can expose them again once CI support
lands.
::::

### Serverless (by solution) [scout-deployment-tags-serverless]

#### All serverless targets [scout-deployment-tags-serverless-all]

| Helper                | What it targets        |
| --------------------- | ---------------------- |
| `tags.serverless.all` | All serverless targets |

#### Search [scout-deployment-tags-serverless-search]

| Helper                   | Project type                      |
| ------------------------ | --------------------------------- |
| `tags.serverless.search` | {icon}`logo_elasticsearch` Search |

#### Observability [scout-deployment-tags-serverless-observability]

| Helper                                          | Project type                                               |
| ----------------------------------------------- | ---------------------------------------------------------- |
| `tags.serverless.observability.all`             | {icon}`logo_observability` All Observability project tiers |
| `tags.serverless.observability.complete`        | {icon}`logo_observability` Observability (Complete)        |
| `tags.serverless.observability.logs_essentials` | {icon}`logo_observability` Observability (Logs Essentials) |

#### Security [scout-deployment-tags-serverless-security]

| Helper                                | Project type                                     |
| ------------------------------------- | ------------------------------------------------ |
| `tags.serverless.security.all`        | {icon}`logo_security` All Security project tiers |
| `tags.serverless.security.complete`   | {icon}`logo_security` Security (Complete)        |
| `tags.serverless.security.essentials` | {icon}`logo_security` Security (Essentials)      |
| `tags.serverless.security.ease`       | {icon}`logo_security` Security (EASE)            |

#### VectorDB [scout-deployment-tags-serverless-vectordb]

| Helper                    | Project type |
| ------------------------- | ------------ |
| `tags.serverless.vectordb` | VectorDB     |

This expands to `@local-serverless-vectordb` and `@cloud-serverless-vectordb`. VectorDB is included in `tags.serverless.all`, but not in `tags.deploymentAgnostic` (this project type doesn't have a stateful counterpart). Add its explicit tags when the test needs VectorDB coverage.

### `tags.performance` [scout-deployment-tags-performance]

Use `tags.performance` for performance tests. It assigns the `@perf` tag.

For the authoritative list (and the exact tag strings), see `src/platform/packages/shared/kbn-scout/src/playwright/tags.ts` or just rely on editor autocomplete.

## Limit tags [scout-deployment-tags-limit]

Limit tags filter tests by **target attributes**: properties of the environment a run executes in that the deployment target doesn't capture, such as Kibana running in FIPS mode. They are a separate concept from deployment tags and complement them rather than replace them: a suite still needs at least one deployment tag to be discovered at all.

Tags follow this shape:

- `@limit/<only|except>-<attribute>`

These are the available tags:

| Helper                   | Use when the test…                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `tags.limit.only.fips`   | is designed for [FIPS mode](../contributing/ci-and-build/debugging-fips-test-failures.md) (skipped everywhere else) |
| `tags.limit.except.fips` | is relevant everywhere except in FIPS mode (skipped there)                                                          |

If a test would need more `except` tags than there are environments it actually applies to, it's an `only` test.

::::::{warning}
Use limit tags sparingly, and never to skip a deployment target (cloud, serverless, a project type): that's what [deployment tags](#scout-deployment-tags-pick) are for.
::::::

Add the limit tag next to the deployment tags:

```ts
test.describe(
  'FIPS-specific behavior',
  { tag: [...tags.deploymentAgnostic, tags.limit.only.fips] },
  () => {
    // ...
  }
);
```

A single test can carry a limit tag too, as long as the enclosing `describe` provides the deployment tags: `test('...', { tag: [tags.limit.except.fips] }, async () => { ... })`. Suites without a limit tag run regardless of attributes.

Scout rejects a suite that has only limit tags, or that combines `only` and `except` for the same attribute (it could never run).

### How limits are applied [scout-deployment-tags-limit-attributes]

1. Tag the suite with a limit tag.
2. Make sure the run declares its target attributes, so Scout can skip the suites whose limit tags don't apply. Scout never detects attributes on its own; with none declared, suites with a `limit.only` tag are skipped and suites with a `limit.except` tag run.

On CI, attributes are declared automatically from the build. Locally, pass them to `scout run-tests` with `--targetAttribute` (see [Run tests](./run-scout-tests.md#scout-run-tests-target-attributes)).

::::::{note}
Use tags to **include** suites where they make sense, instead of skipping suites after the fact.
::::::

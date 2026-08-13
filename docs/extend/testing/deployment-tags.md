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

Workplace AI is excluded because it has no stateful counterpart.

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

#### Workplace AI [scout-deployment-tags-serverless-workplaceai]

| Helper                        | Project type                               |
| ----------------------------- | ------------------------------------------ |
| `tags.serverless.workplaceai` | {icon}`logo_workplace_search` Workplace AI |

### `tags.performance` [scout-deployment-tags-performance]

Use `tags.performance` for performance tests. It assigns the `@perf` tag.

For the authoritative list (and the exact tag strings), see `src/platform/packages/shared/kbn-scout/src/playwright/tags.ts` or just rely on editor autocomplete.

::::::{note}
Use tags to **include** suites where they make sense, instead of skipping suites after the fact.
::::::

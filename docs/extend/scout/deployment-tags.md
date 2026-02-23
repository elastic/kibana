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

Prefer the `tags` helper exported by Scout instead of writing raw strings. It returns arrays of Playwright tags you can use directly or combine.

```ts
import { test, tags } from '@kbn/scout';

test.describe('My suite', { tag: tags.deploymentAgnostic }, () => {
  test('works', async () => {
    // ...
  });
});
```

Combine multiple targets by spreading:

```ts
test.describe('My suite', { tag: [...tags.stateful.classic, ...tags.serverless.search] }, () => {
  // ...
});
```

## Common shortcuts [scout-deployment-tags-shortcuts]

Unless stated otherwise, these helpers include **both** `@local-*` and `@cloud-*` targets.

### Cross-cutting helpers [scout-deployment-tags-cross-cutting]

| Helper                    | What it targets                                                                                                                                                                               |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tags.deploymentAgnostic` | **Recommended if your test can run (almost) everywhere**: includes stateful + serverless `*.complete`. Excludes serverless Workplace AI projects (as they don't have a stateful counterpart). |
| `tags.performance`        | Performance tests (`@perf`)                                                                                                                                                                   |

### Stateful (by domain) [scout-deployment-tags-stateful]

| Helper                        | Domain               |
| ----------------------------- | -------------------- |
| `tags.stateful.all`           | All stateful targets |
| `tags.stateful.classic`       | Classic              |
| `tags.stateful.search`        | Search               |
| `tags.stateful.observability` | Observability        |
| `tags.stateful.security`      | Security             |

### Serverless (by solution) [scout-deployment-tags-serverless]

#### All serverless targets [scout-deployment-tags-serverless-all]

| Helper                | What it targets        |
| --------------------- | ---------------------- |
| `tags.serverless.all` | All serverless targets |

#### Search [scout-deployment-tags-serverless-search]

| Helper                   | Project type |
| ------------------------ | ------------ |
| `tags.serverless.search` | Search       |

#### Observability [scout-deployment-tags-serverless-observability]

| Helper                                          | Project type                    |
| ----------------------------------------------- | ------------------------------- |
| `tags.serverless.observability.complete`        | Observability (complete)        |
| `tags.serverless.observability.logs_essentials` | Observability (logs_essentials) |

#### Security [scout-deployment-tags-serverless-security]

| Helper                                | Project type          |
| ------------------------------------- | --------------------- |
| `tags.serverless.security.complete`   | Security (complete)   |
| `tags.serverless.security.essentials` | Security (essentials) |
| `tags.serverless.security.ease`       | Security (ease)       |

#### Workplace AI [scout-deployment-tags-serverless-workplaceai]

| Helper                        | Project type |
| ----------------------------- | ------------ |
| `tags.serverless.workplaceai` | Workplace AI |

For the authoritative list (and the exact tag strings), see `src/platform/packages/shared/kbn-scout/src/playwright/tags.ts` or just rely on editor autocomplete.

::::::{note}
Use tags to **include** suites where they make sense, instead of skipping suites after the fact.
::::::

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

| Shortcut                                                          | What it targets                                                                                                                    |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `tags.deploymentAgnostic`                                         | Broad **“runs almost everywhere”** set (stateful + "complete" serverless counterparts). Excludes workplace AI serverless projects. |
| `tags.stateful.classic` / `search` / `observability` / `security` | Stateful environments (local + cloud) for that domain                                                                              |
| `tags.serverless.search`                                          | Serverless search (local + cloud)                                                                                                  |
| `tags.serverless.observability.complete` / `logs_essentials`      | Serverless observability projects (local + cloud)                                                                                  |
| `tags.serverless.security.complete` / `essentials` / `ease`       | Serverless security projects (local + cloud)                                                                                       |
| `tags.serverless.workplaceai`                                     | Serverless Workplace AI (local + cloud)                                                                                            |
| `tags.stateful.all` / `tags.serverless.all`                       | All targets for that architecture                                                                                                  |
| `tags.performance`                                                | Performance tests (`@perf`)                                                                                                        |

For the authoritative list (and the exact tag strings), see `src/platform/packages/shared/kbn-scout/src/playwright/tags.ts` or just rely on editor autocomplete.

::::::{note}
Use tags to **include** suites where they make sense, instead of skipping suites after the fact.
::::::

---
navigation_title: Deployment tags
---

# Deployment tags [scout-deployment-tags]

Deployment tags are **mandatory** for every `test.describe()` block. They control which environments your Scout tests run in. Instead of skipping tests, you explicitly declare which deployment types each test suite targets.

Each tag follows the format `@{location}-{arch}-{domain}`, where:

- **location**: `local` (self-managed / mock-serverless) or `cloud` (Elastic Cloud hosted / MKI)
- **arch**: `stateful` or `serverless`
- **domain**: product area (for example: `classic`, `search`, `observability_complete`, `security_complete`, `workplaceai`)

Rather than using raw tag strings, prefer the `tags` helper exported by `@kbn/scout`. Each shortcut returns an array of Playwright tags.

## Tag shortcuts [scout-deployment-tags-shortcuts]

### Stateful [scout-deployment-tags-stateful]

| `tags` shortcut | Underlying Playwright tags |
| --- | --- |
| `tags.stateful.classic` | `@local-stateful-classic`, `@cloud-stateful-classic` |
| `tags.stateful.search` | `@local-stateful-search`, `@cloud-stateful-search` |
| `tags.stateful.observability` | `@local-stateful-observability_complete`, `@cloud-stateful-observability_complete` |
| `tags.stateful.security` | `@local-stateful-security_complete`, `@cloud-stateful-security_complete` |

### Serverless [scout-deployment-tags-serverless]

| `tags` shortcut | Underlying Playwright tags |
| --- | --- |
| `tags.serverless.search` | `@local-serverless-search`, `@cloud-serverless-search` |
| `tags.serverless.observability.complete` | `@local-serverless-observability_complete`, `@cloud-serverless-observability_complete` |
| `tags.serverless.observability.logs_essentials` | `@local-serverless-observability_logs_essentials`, `@cloud-serverless-observability_logs_essentials` |
| `tags.serverless.security.complete` | `@local-serverless-security_complete`, `@cloud-serverless-security_complete` |
| `tags.serverless.security.essentials` | `@local-serverless-security_essentials`, `@cloud-serverless-security_essentials` |
| `tags.serverless.security.ease` | `@local-serverless-security_ease`, `@cloud-serverless-security_ease` |
| `tags.serverless.workplaceai` | `@local-serverless-workplaceai`, `@cloud-serverless-workplaceai` |

## Aggregate shortcuts [scout-deployment-tags-aggregate]

Use these to target broader groups of environments:

| Shortcut | Description |
| --- | --- |
| `tags.stateful.all` | All stateful domain types (classic, search, observability, security) |
| `tags.serverless.observability.all` | All serverless observability project types |
| `tags.serverless.security.all` | All serverless security project types |
| `tags.serverless.all` | All serverless project types |
| `tags.deploymentAgnostic` | All stateful types + serverless types that have a stateful counterpart |
| `tags.performance` | Performance tests (`@perf`) |

## Using deployment tags [scout-deployment-tags-using]

Import `tags` and pass a shortcut to the `tag` property in `test.describe()` (or `apiTest.describe()` / `spaceTest.describe()`).

Since each shortcut is an array, you can use it directly or spread multiple shortcuts together:

```ts
import { test, tags } from '@kbn/scout';

// Runs on stateful classic + serverless observability (complete) environments
test.describe(
  'My test suite',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.observability.complete],
  },
  () => {
    test('my test', async ({ page }) => {
      // test code
    });
  }
);
```

For deployment-agnostic tests that should run across all stateful and most serverless environments, use `tags.deploymentAgnostic`:

```ts
import { apiTest, tags } from '@kbn/scout';

apiTest.describe('GET /api/endpoint', { tag: tags.deploymentAgnostic }, () => {
  apiTest('should return 200', async ({ apiClient }) => {
    // test code
  });
});
```

For tests that should only run on stateful deployments:

```ts
import { test, tags } from '@kbn/scout';

test.describe('Stateful-only feature', { tag: tags.stateful.all }, () => {
  test('my test', async ({ page }) => {
    // test code
  });
});
```

:::::{note}
Use deployment tags to **include** tests for specific environments rather than skipping them. This makes it explicit where each suite is expected to run and prevents accidental runs in unsupported environments.
:::::


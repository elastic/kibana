---
name: scout-api-testing
description: Use when creating, updating, debugging, or reviewing Scout API tests in Kibana (apiTest/apiClient/requestAuth/samlAuth/apiServices), including auth choices, response assertions, and API service patterns.
---

# Scout API Testing

## Core rules (API)

- API specs live in `<module-root>/test/scout*/api/{tests,parallel_tests}/**/*.spec.ts` (examples: `test/scout/api/...`, `test/scout_uiam_local/api/...`).
- Use the Scout package that matches the module root:
- `src/platform/**` or `x-pack/platform/**` -> `@kbn/scout`
- `x-pack/solutions/observability/**` -> `@kbn/scout-oblt`
- `x-pack/solutions/search/**` -> `@kbn/scout-search`
- `x-pack/solutions/security/**` -> `@kbn/scout-security`
- Prefer a single top-level `apiTest.describe(...)` per file and avoid nested `describe` blocks; multiple top-level `describe`s are supported, but files get hard to read quickly.
- Tags: add `{ tag: ... }` on the suite (or individual tests) so CI/discovery can select the right test target (for example `tags.deploymentAgnostic` or `[...tags.stateful.classic]`). Unlike UI tests, API tests don’t currently validate tags at runtime.
- If the module provides Scout fixtures, import `apiTest` from `<module-root>/test/scout*/api/fixtures` to get module-specific extensions. Importing directly from the module’s Scout package is also fine when you don’t need extensions.
- Browser fixtures are disabled for `apiTest` (no `page`, `browserAuth`, `pageObjects`).

## Imports

- Test framework + tags: `import { apiTest, tags } from '@kbn/scout';` (or the module's Scout package, e.g. `@kbn/scout-oblt`)
- Assertions: `import { expect } from '@kbn/scout/api';` (or `@kbn/scout-oblt/api`, etc.) — **not** from the main entry
- Types: `import type { RoleApiCredentials } from '@kbn/scout';`
- `expect` is **not** exported from the main `@kbn/scout` entry. Use the `/api` subpath for API tests.

## Auth: pick based on endpoint

- `api/*` endpoints: use **API keys** via `requestAuth` (`getApiKey`, `getApiKeyForCustomRole`).
- `internal/*` endpoints: use **cookies** via `samlAuth.asInteractiveUser(...)`.

## Recommended test shape

1. **Prepare** environment (optional): `apiServices`/`kbnClient`/`esArchiver` in `beforeAll`.
2. **Authenticate** (least privilege): generate credentials in `beforeAll` and reuse.
3. **Request**: call the endpoint with `apiClient` and the right headers.
4. **Assert**: verify `statusCode` and response body; verify side effects via `apiServices`/`kbnClient` when needed.

Important: `apiServices`/`kbnClient` run with elevated privileges. Don’t use them to validate the endpoint under test (use `apiClient` + scoped auth).

Header reminders:
- State-changing requests usually need `kbn-xsrf`.
- Prefer sending `x-elastic-internal-origin: kibana` for Kibana APIs.
- Include `elastic-api-version` for versioned public APIs (e.g. `'2023-10-31'`) or internal APIs (e.g. `'1'`).

## Assertions

- `apiClient` methods (`get`, `post`, `put`, `delete`, `patch`, `head`) return `{ statusCode, body, headers }`.
- Use the custom matchers from `@kbn/scout/api`:
  - `expect(response).toHaveStatusCode(200)`
  - `expect(response).toHaveStatusText('OK')`
  - `expect(response).toHaveHeaders({ 'content-type': 'application/json' })`
- Standard matchers (`toBe`, `toStrictEqual`, `toMatchObject`, etc.) and asymmetric matchers (`expect.objectContaining(...)`, `expect.any(String)`) are also available.

## API services

- Put reusable server-side helpers behind `apiServices` (no UI interactions). Use it for setup/teardown and verifying side effects, not for RBAC validation.
- **Module-local service**: create it under `<module-root>/test/scout*/api/services/<service>_api_service.ts` (or similar). Register it by extending the module's `apiServices` fixture in `<module-root>/test/scout*/api/fixtures/index.ts` (prefer `{ scope: 'worker' }` when the helper doesn't need per-test state).
- **Shared service** (reused across modules): consider contributing it to the Scout packages under `src/platform/packages/shared/kbn-scout/src/playwright/fixtures/scope/worker/apis/`.

## Extending fixtures

When tests need custom auth helpers or API services, extend `apiTest` in the module's `fixtures/index.ts`:

```ts
import { apiTest as base } from '@kbn/scout'; // or the module's Scout package
import type { RequestAuthFixture } from '@kbn/scout';

interface MyApiFixtures {
  requestAuth: RequestAuthFixture & { getMyPluginApiKey: () => Promise<RoleApiCredentials> };
}

export const apiTest = base.extend<MyApiFixtures>({
  requestAuth: async ({ requestAuth }, use) => {
    const getMyPluginApiKey = async () =>
      requestAuth.getApiKeyForCustomRole({
        kibana: [{ base: [], feature: { myPlugin: ['all'] }, spaces: ['*'] }],
      });
    await use({ ...requestAuth, getMyPluginApiKey });
  },
});
```

Tests then import `apiTest` from the local fixtures: `import { apiTest } from '../fixtures';`

## Parallelism

- Treat Scout API tests as sequential by default. Parallel API runs require manual isolation (spaces, indices, saved objects) and are uncommon.

## Run / debug quickly

- Use either `--config` or `--testFiles` (they are mutually exclusive).
- Run by config: `node scripts/scout.js run-tests --stateful --config <module-root>/test/scout*/api/playwright.config.ts` (or `.../api/parallel.playwright.config.ts` for parallel API runs)
- Run by file/dir (Scout derives the right `playwright.config.ts` vs `parallel.playwright.config.ts`): `node scripts/scout.js run-tests --stateful --testFiles <module-root>/test/scout*/api/tests/my.spec.ts`
- For faster iteration, start servers once in another terminal: `node scripts/scout.js start-server --stateful [--config-dir <configSet>]`, then run Playwright directly: `npx playwright test --config <...> --project local --grep <tag>`.
- `--config-dir` notes:
- `run-tests` auto-detects the custom config dir from `.../test/scout_<name>/...` paths (override with `--config-dir <name>` if needed).
- `start-server` has no Playwright config to inspect, so pass `--config-dir <name>` when your tests require a custom server config.
- Debug: `SCOUT_LOG_LEVEL=debug`

## CI enablement

- Scout tests run in CI only for modules listed under `plugins.enabled` / `packages.enabled` in `.buildkite/scout_ci_config.yml`.
- `node scripts/scout.js generate` registers the module under `enabled` so the new configs run in CI.

## References

Open only what you need:

- requestAuth vs samlAuth, headers, and least-privilege auth tips: `references/scout-api-auth.md`
- Creating and registering `apiServices` helpers (kbnClient + retries + logging): `references/scout-api-services.md`

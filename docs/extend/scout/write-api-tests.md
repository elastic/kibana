---
navigation_title: Write API tests
---

# Write Scout API tests [scout-write-api-tests]

Scout API tests validate HTTP endpoints with realistic scoped credentials.

:::::{important}
[Set up your plugin or package](./setup-plugin.md) first.
:::::

## Recommended structure [api-test-suite-anatomy]

1. **Prepare** with higher-privilege helpers (`apiServices`, `kbnClient`, `esArchiver`, …)
2. **Authenticate** with `requestAuth` (or `samlAuth` for `internal/*`)
3. **Call the endpoint under test** with `apiClient` + the scoped headers
4. **Assert** status + response body, and verify side effects when needed

See [best practices for API tests](./best-practices.md#api-tests).

Example test ([Console](https://github.com/elastic/kibana/blob/main/src/platform/plugins/shared/console/test/scout/api/tests/spec_definitions.spec.ts)).

## Save the test file [save-api-test-file]

API tests live under `<plugin-root>/test/scout/api/tests` and must end with `.spec.ts`.

## Next steps [api-tests-next]

- [API authentication](./api-auth.md)
- [Best practices](./best-practices.md)
- [Fixtures](./fixtures.md)
- [Run tests](./run-tests.md) and [Debugging](./debugging.md)
- [Parallelism notes](./parallelism.md#api-tests-and-parallelism)

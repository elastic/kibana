---
navigation_title: Write UI tests
---

# Write Scout UI tests [scout-write-ui-tests]

Scout UI tests are Playwright tests that use Scout fixtures and page objects for readable, maintainable flows.

:::::{important}
[Set up your plugin or package](./setup-plugin.md) first.
:::::

## A good starting pattern [scout-write-ui-tests-pattern]

- Authenticate with `browserAuth` in `beforeEach`
- Navigate and interact via `pageObjects`
- Use `test.step` for multi-step flows you want to read in reports

Example test ([APM](https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/apm/test/scout/ui/parallel_tests/settings/anomaly_detection.spec.ts)).

## Save the test file [scout-write-ui-tests-save]

- Sequential UI tests: `<plugin-root>/test/scout/ui/tests`
- Parallel UI tests: `<plugin-root>/test/scout/ui/parallel_tests`

Spec files must end with `.spec.ts`.

## Next steps [scout-write-ui-tests-next]

- [Browser authentication](./browser-auth.md)
- [Best practices](./best-practices.md)
- [Page objects](./page-objects.md)
- [Fixtures](./fixtures.md)
- [Run tests](./run-tests.md) and [Debugging](./debugging.md)

---
navigation_title: Functional Test Runner (FTR)
---

# Functional Test Runner (FTR) [ftr]

The Functional Test Runner (FTR) is Kibana's legacy end-to-end test framework. It bootstraps a full Elastic Stack (Elasticsearch + Kibana) and runs test suites against it.

::::{note}
New tests should use [Scout](./scout.md) instead of FTR. Scout is faster, easier to debug, and supports parallel execution. Existing FTR tests continue to run, and teams can migrate to Scout incrementally.
::::

## When to use FTR [ftr-when-to-use]

Use FTR when:
- You are maintaining or extending an **existing FTR test suite**
- Your test scenario is not yet supported by Scout

For new tests, prefer [Scout](./scout.md).

## How FTR works [ftr-how-it-works]

FTR starts Elasticsearch and Kibana from a config file, then runs test files against the running servers. Tests use a service-based API (`getService('supertest')`, `getService('security')`, etc.) to interact with the stack.

**Development workflow:**

```bash
# Start servers once, keep them running
yarn test:ftr:server --config path/to/config.ts

# In a second terminal, run tests against the running servers
yarn test:ftr:runner --config path/to/config.ts
```

**Useful flags:**

```bash
# Run a specific test by name
yarn test:ftr:runner --config path/to/config.ts --grep "test name"

# Debug with browser open, stop on first failure
yarn test:ftr --config path/to/config.ts --debug --bail

# Run against serverless Elasticsearch
yarn test:ftr --config path/to/config.ts --esFrom serverless
```

**Pros:**
- Runs the full Elastic Stack
- Tests cross-plugin integration
- Supports complex server configuration

**Cons:**
- Slow startup (full stack boot on every run)
- Hard to debug
- Brittle tests due to shared state and timing sensitivity
- No parallel execution

## FTR config manifests [ftr-config-manifests]

The {{kib}} repo contains many FTR config files which use slightly different configurations for the {{kib}} server or {{es}}, have different test files, and potentially other config differences. FTR config files are organised in manifest files under `.buildkite/ftr-manifests/`, grouped by testing area and type of distribution:

- serverless:
  - `.buildkite/ftr-manifests/ftr_base_serverless_configs.yml`
  - `.buildkite/ftr-manifests/ftr_oblt_serverless_configs.yml`
  - `.buildkite/ftr-manifests/ftr_security_serverless_configs.yml`
  - `.buildkite/ftr-manifests/ftr_search_serverless_configs.yml`
- stateful:
  - `.buildkite/ftr-manifests/ftr_platform_stateful_configs.yml`
  - `.buildkite/ftr-manifests/ftr_oblt_stateful_configs.yml`
  - `.buildkite/ftr-manifests/ftr_security_stateful_configs.yml`
  - `.buildkite/ftr-manifests/ftr_search_stateful_configs.yml`

If you're writing a plugin outside the {{kib}} repo, you will have your own config file. See [Functional Tests for Plugins outside the {{kib}} repo](/extend/tutorials/external-plugin-functional-tests.md) for more info.

## Adding an FTR test [ftr-add-test]

You can reuse the existing [api_integration](https://github.com/elastic/kibana/blob/main/src/platform/test/api_integration/config.js) setup by registering a test file in the [test loader](https://github.com/elastic/kibana/blob/main/src/platform/test/api_integration/apis/index.ts).

```typescript
// src/platform/test/api_integration/apis/my_plugin/something.ts
export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('myPlugin', () => {
    it('stores text', async () => {
      const response = await supertest
        .post('/myPlugin/formatter/text')
        .set('content-type', 'application/json')
        .send({ text: 'hello' })
        .expect(200);

      expect(response.body).to.have.property('id');
    });
  });
}
```

See the [CONTRIBUTING guide](https://github.com/elastic/kibana/blob/main/CONTRIBUTING.md#running-specific-kibana-tests) for more detail on running specific FTR suites.

## Migrating from FTR to Scout [ftr-migration]

Scout provides equivalent capabilities for most FTR use cases:

| FTR concept | Scout equivalent |
| --- | --- |
| `getService('supertest')` | `apiClient` fixture |
| `getService('security')` | `samlAuth` / `apiKey` auth options |
| `getService('esArchiver')` | Data setup in `global.setup.ts` via API services |
| Page object pattern | [Scout page objects](./page-objects.md) |
| Browser interaction | Playwright `page` fixture |

Start with [Set up Scout in your plugin](./setup-scout.md) to add Scout alongside your existing FTR tests.

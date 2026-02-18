---
navigation_title: Run tests
---

# Run Scout tests [scout-run-tests]

This guide explains how to run Scout tests locally and on Elastic Cloud.

For additional details, see the public-facing `@kbn/scout` README:

- `https://github.com/elastic/kibana/blob/main/src/platform/packages/shared/kbn-scout/README.md#how-to-use`

:::::{note}
The same Playwright commands apply to **UI** and **API** tests. To run API tests, point the command to the Playwright config that contains your API tests.
:::::

## Run Scout tests against a local deployment [scout-run-tests-local]

Scout requires Kibana and Elasticsearch to be running before running tests against a local deployment.

### Start servers [scout-start-servers]

Start servers with the Scout CLI:

```bash
node scripts/scout.js start-server \
  --arch [stateful|serverless] \
  --domain [search|observability_complete|observability_logs_essentials|security_complete|security_essentials|security_ease|workplaceai] <1>
```

1. `start-server` is a Scout CLI command.

### Run tests [scout-run-tests-playwright]

In a separate terminal, run the tests with Playwright:

```bash
npx playwright test --config <plugin-path>/test/scout/ui/playwright.config.ts \
  --project local <1> \
  --grep @<location>-<arch>-<domain> <2>
```

1. Use `--project local` to run against your local Kibana/Elasticsearch processes.
2. Use `--grep` to filter suites by deployment tag (for example `@local-stateful-classic`, `@cloud-serverless-search`, `@local-serverless-security_complete`). If you omit `--grep`, Playwright will run all suites defined by the config—even ones that may not be compatible with your target.

### One command: start servers + run tests [scout-run-tests-cli]

Alternatively, start servers and run tests in one command:

```bash
node scripts/scout.js run-tests \
  --arch [stateful|serverless] \
  --domain [search|observability_complete|observability_logs_essentials|security_complete|security_essentials|security_ease|workplaceai] \
  --config <plugin-path>/test/scout/ui/playwright.config.ts
```

When Scout starts Kibana and Elasticsearch locally, it saves server configuration to `.scout/servers/local.json` and later reads it when running tests.

### Run specific tests with `--testFiles` [scout-run-tests-testFiles]

You can pass a directory:

```bash
node scripts/scout.js run-tests \
  --arch [stateful|serverless] \
  --domain [search|observability_complete|observability_logs_essentials|security_complete|security_essentials|security_ease|workplaceai] \
  --testFiles <plugin-path>/test/scout/ui/tests/test_sub_directory
```

Or a comma-separated list of spec files:

```bash
node scripts/scout.js run-tests \
  --arch [stateful|serverless] \
  --domain [search|observability_complete|observability_logs_essentials|security_complete|security_essentials|security_ease|workplaceai] \
  --testFiles <plugin-path>/test/scout/ui/tests/your_test_spec.ts,<plugin-path>/test/scout/ui/tests/another_test_spec.ts
```

:::::{warning}
All paths provided to `--testFiles` must fall under the same Scout root (for example, `scout/ui/tests`, `scout/ui/parallel_tests`, or `scout/api/tests`) and must belong to the same Playwright config file (Scout will discover it).
:::::

### Run multiple files directly with Playwright [scout-run-tests-multiple-files]

```bash
npx playwright test \
  <plugin-path>/test/scout/ui/tests/test_one.spec.ts \
  <plugin-path>/test/scout/ui/tests/test_two.spec.ts \
  --config <path/to/your/config>/playwright.config.ts \
  --project local \
  --grep @<location>-<arch>-<domain>
```

## Run Scout tests on Elastic Cloud [scout-run-tests-cloud]

Scout can run tests on Elastic Cloud, but you must provide a server configuration file under `.scout/servers/`.

::::{tab-set}

:::{tab-item} "ECH (stateful)"

Open `.scout/servers/cloud_ech.json`:

```json
{
  "serverless": false,
  "isCloud": true,
  "cloudHostName": "<elastic_cloud_hostname>",
  "cloudUsersFilePath": ".ftr/role_users.json",
  "hosts": {
    "kibana": "<kibana_deployment_url>",
    "elasticsearch": "<elasticsearch_deployment_url>"
  },
  "auth": {
    "username": "<deployment_username>",
    "password": "<deployment_password>"
  }
}
```

Run tests with `--project ech`:

```bash
npx playwright test --config <plugin-path>/test/scout/ui/playwright.config.ts \
  --project ech \
  --grep @cloud-stateful-<domain>
```

:::

:::{tab-item} "MKI (serverless)"

Open `.scout/servers/cloud_mki.json`:

```json
{
  "serverless": true,
  "projectType": "es",
  "isCloud": true,
  "cloudHostName": "<elastic_cloud_hostname>",
  "cloudUsersFilePath": ".ftr/role_users.json",
  "hosts": {
    "kibana": "<kibana_project_url>",
    "elasticsearch": "<elasticsearch_project_url>"
  },
  "auth": {
    "username": "testing-internal",
    "password": "<operator_password>"
  }
}
```

Run tests with `--project mki`:

```bash
npx playwright test --config <plugin-path>/test/scout/ui/playwright.config.ts \
  --project mki \
  --grep @cloud-serverless-<domain>
```

:::::{note}
Internal (Elasticians): `testing-internal` is an operator user. Retrieving/resetting its credentials and provisioning Cloud role users is internal-only; see internal AppEx QA documentation.
:::::

:::

:::: 

You can also run tests on Elastic Cloud using the Scout CLI:

```bash
node scripts/scout.js run-tests \
  --arch stateful \
  --domain classic \
  --location cloud \
  --config <plugin-path>/test/scout/ui/playwright.config.ts
```

```bash
node scripts/scout.js run-tests \
  --arch serverless \
  --domain [search|observability_complete|observability_logs_essentials|security_complete|security_essentials|security_ease|workplaceai] \
  --location cloud \
  --config <plugin-path>/test/scout/ui/playwright.config.ts
```

## Run Scout tests with QAF (internal) [scout-run-tests-qaf]

Internal (Elasticians): QAF is an internal tool. For how to run Scout tests with QAF and associated workflows, refer to internal AppEx QA documentation.


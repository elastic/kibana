---
navigation_title: Run tests
---

# Run Scout tests [scout-run-tests]

:::::::{tip}
The commands below work the same way for both UI and API tests.
:::::::

## Local runs [scout-run-tests-local]

Scout requires Kibana and Elasticsearch to be running before running tests against a local deployment.

### Start servers [scout-start-servers]

```bash
node scripts/scout.js start-server \
  --arch <stateful|serverless> \
  --domain <classic|search|observability_complete|observability_logs_essentials|security_complete|security_essentials|security_ease|workplaceai>
```

### Run tests with Playwright [scout-run-tests-playwright]

```bash
npx playwright test --config <plugin-path>/test/scout/ui/playwright.config.ts \
  --project local \
  --grep @<location>-<arch>-<domain>
```

- Use `--project local` to target your locally running Kibana/Elasticsearch processes.
- Use `--grep` to filter by tag (for example `@local-stateful-classic`, `@cloud-serverless-search`). If you omit `--grep`, Playwright will run all suites in the config, including ones that may not be compatible with your target.

### One command: start servers + run tests [scout-run-tests-cli]

```bash
node scripts/scout.js run-tests \
  --arch <stateful|serverless> \
  --domain <classic|search|observability_complete|observability_logs_essentials|security_complete|security_essentials|security_ease|workplaceai> \
  --config <plugin-path>/test/scout/ui/playwright.config.ts
```

When Scout starts Kibana and Elasticsearch locally, it saves the server configuration to `.scout/servers/local.json` and later reads it when running tests.

### Run a subset with `--testFiles` [scout-run-tests-testFiles]

Directory:

```bash
node scripts/scout.js run-tests \
  --arch <stateful|serverless> \
  --domain <domain> \
  --testFiles <plugin-path>/test/scout/ui/tests/some_dir
```

Comma-separated file list:

```bash
node scripts/scout.js run-tests \
  --arch <stateful|serverless> \
  --domain <domain> \
  --testFiles <path/to/one.spec.ts>,<path/to/two.spec.ts>
```

:::::::{warning}
All `--testFiles` paths must fall under the same Scout root (for example, `scout/ui/tests` vs `scout/ui/parallel_tests`) so Scout can discover the right config.
:::::::

## Elastic Cloud runs [scout-run-tests-cloud]

To run on ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg 'Supported on Elastic Cloud Hosted') Elastic Cloud you must provide a server config under `.scout/servers/`.

:::::{tab-set}

::::{tab-item} ECH (stateful)

Open `<KIBANA_ROOT>/.scout/servers/cloud_ech.json`:

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

- `cloudHostName`: the Cloud environment hostname (for example `console.qa.cld.elstc.co` or `cloud.elastic.co`)
- `cloudUsersFilePath`: credentials for Cloud role users (often `<KIBANA_ROOT>/.ftr/role_users.json`)

Run tests with `--project ech`:

```bash
npx playwright test --config <plugin-path>/test/scout/ui/playwright.config.ts \
  --project ech \
  --grep @cloud-stateful-<domain>
```

Example `--grep` values: `@cloud-stateful-classic`, `@cloud-stateful-search`.

::::

::::{tab-item} MKI (serverless)

Open `<KIBANA_ROOT>/.scout/servers/cloud_mki.json`:

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

- `projectType` values: `es`, `security`, `oblt`, `workplaceai`
- `cloudHostName`: the Cloud environment hostname (for example `console.qa.cld.elstc.co` or `cloud.elastic.co`)
- More information on how to get the `<operator_password>` in the info box below

Run tests with `--project mki`:

```bash
npx playwright test --config <plugin-path>/test/scout/ui/playwright.config.ts \
  --project mki \
  --grep @cloud-serverless-<domain>
```

:::::::{note}
Internal (Elasticians): `testing-internal` is an operator user with `superuser` privileges plus additional [operator privileges](https://www.elastic.co/docs/deploy-manage/users-roles/cluster-or-deployment-auth/operator-privileges).

To retrieve its password, call the `_reset-internal-credentials` Elastic Cloud API endpoint (this resets the credential and returns a new password):

```bash
curl -XPOST \
  -H "Authorization: ApiKey $API_KEY" \
  "${CLOUD_ENV_URL}/api/v1/serverless/projects/elasticsearch/${PROJECT_ID}/_reset-internal-credentials"
```

- `API_KEY`: create in the Elastic Cloud UI (Organization → API keys)
- `CLOUD_ENV_URL`: base URL of your Cloud environment (for example `https://console.qa.cld.elstc.co`)
- `PROJECT_ID`: serverless project ID from the Cloud UI
  :::::::

::::

:::::

Example `--grep` values: `@cloud-serverless-search`, `@cloud-serverless-observability_complete`, `@cloud-serverless-security_ease`.

:::::::{note}
Internal (Elasticians): provisioning Cloud users/roles and populating `<kibana root>/.ftr/role_users.json` is internal-only; see [internal AppEx QA documentation](https://docs.elastic.dev/appex-qa/create-cloud-users).
:::::::

### Run on Cloud with the Scout CLI [scout-run-tests-cloud-cli]

:::::{tab-set}

::::{tab-item} ECH (stateful)

```bash
node scripts/scout.js run-tests \
  --arch stateful \
  --domain <classic|search|observability_complete|security_complete> \
  --location cloud \
  --config <plugin-path>/test/scout/ui/playwright.config.ts
```

::::

::::{tab-item} MKI (serverless)

```bash
node scripts/scout.js run-tests \
  --arch serverless \
  --domain <search|observability_complete|observability_logs_essentials|security_complete|security_essentials|security_ease|workplaceai> \
  --location cloud \
  --config <plugin-path>/test/scout/ui/playwright.config.ts
```

::::

:::::

## Run Scout tests with QAF (internal) [scout-run-tests-qaf]

QAF is an internal tool for Elasticians only. To run Scout tests with QAF, refer to [internal AppEx QA documentation](https://docs.elastic.dev/appex-qa/qaf/guides/run-scout-tests-with-qaf).

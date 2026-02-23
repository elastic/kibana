---
navigation_title: Run tests
---

# Run Scout tests [scout-run-tests]

:::::::{tip}
The commands below work the same way for both UI and API tests.
:::::::

## Local runs [scout-run-tests-local]

Scout requires Kibana and Elasticsearch to be running before running tests against a **local deployment**.

::::::{stepper}

:::::{step} Start servers once

Start the Kibana and Elasticsearch servers once:

```bash
node scripts/scout.js start-server \
  --arch <stateful|serverless> \
  --domain <classic|search|observability_complete|observability_logs_essentials|security_complete|security_essentials|security_ease|workplaceai>
```

:::::

:::::{step} Run tests as often as you'd like (in a separate terminal)

And then run tests how often you'd like against the same test servers:

```bash
npx playwright test --config <plugin-path>/test/scout/ui/playwright.config.ts \
  --project local \
  --grep @<location>-<arch>-<domain>
```

- Use `--project local` to target your locally running Kibana/Elasticsearch processes.
- Use `--grep` to filter by tag (for example `@local-stateful-classic`). If you omit `--grep`, Playwright will run all suites in the config, including ones that may not be compatible with your target.

We recommend checking out Playwright's [**UI mode**](./debugging.md#playwright-ui-mode) (use `--ui`).

:::::
::::::::

### Alternative: one command to start servers + run tests [scout-run-tests-cli]

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

## Run tests on Elastic Cloud [scout-run-tests-cloud]

Follow these steps to run your Scout tests on a real ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg 'Supported on Elastic Cloud Hosted') **Elastic Cloud project or deployment**.

::::::{tip}
**QAF** (internal, Elasticians-only tool) provides a `qaf kibana scout run-config` command to help you run Scout tests using a QAF-registered project or deployment. Great for CI workflows, but also works locally. Check out [Run Scout tests with QAF](https://docs.elastic.dev/appex-qa/qaf/guides/run-scout-tests-with-qaf) (Elasticians only).
::::::

::::::{stepper}

:::::{step} Create Elastic Cloud users

Follow our [internal guide to provision internal users](https://docs.elastic.dev/appex-qa/create-cloud-users) (Elasticians only) to then populate the `<kibana-root>/.ftr/role_users.json` file.

:::::

:::::{step} Create Elastic Cloud project or deployment

Use the Elastic Cloud UI or [create them with QAF](https://docs.elastic.dev/appex-qa/kibana-cloud-testing#create-an-elastic-cloud-deployment-or-project) (internal guide, Elasticians only).

:::::

:::::{step} Tell Scout about your new project or deployment and run tests

Create and fill out the relevant file in `<kibana-root>/.scout/servers`: `cloud_ech.json` for ECH deployments and `cloud_mki.json` for MKI projects.

Follow the instructions below:

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

#### Run tests with `--project ech`:

```bash
npx playwright test --config <plugin-path>/test/scout/ui/playwright.config.ts \
  --project ech \
  --grep @cloud-stateful-<domain>
```

Example `--grep` values: `@cloud-stateful-classic`, `@cloud-stateful-search`.

Alternatively, run tests with the **Scout CLI**:

```bash
node scripts/scout.js run-tests \
  --arch stateful \
  --domain <classic|search|observability_complete|security_complete> \
  --location cloud \
  --config <plugin-path>/test/scout/ui/playwright.config.ts
```

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

#### Run tests with `--project mki`:

```bash
npx playwright test --config <plugin-path>/test/scout/ui/playwright.config.ts \
  --project mki \
  --grep @cloud-serverless-<domain>
```

Alternatively, run tests with the **Scout CLI**:

```bash
node scripts/scout.js run-tests \
  --arch serverless \
  --domain <search|observability_complete|observability_logs_essentials|security_complete|security_essentials|security_ease|workplaceai> \
  --location cloud \
  --config <plugin-path>/test/scout/ui/playwright.config.ts
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

:::::

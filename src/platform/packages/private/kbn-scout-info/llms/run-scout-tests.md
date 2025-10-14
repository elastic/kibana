# Run Scout tests

This article explains how to run Scout tests locally and on Elastic Cloud. For additional guidance, refer to the public-facing `@kbn/scout` [README](https://github.com/elastic/kibana/blob/main/src/platform/packages/shared/kbn-scout/README.md#how-to-use).

> **The same commands for UI and API testing**
>
> The commands below work the same way for both **UI** and **API** tests. To run API tests, simply point the command to the Playwright configuration file that contains your API tests.

---

## Run Scout tests against a local deployment

Scout requires both Kibana and Elasticsearch to be running before executing tests against a local deployment.

To **start the servers**, use the Scout CLI command:

```bash
node scripts/scout.js start-server [--stateful|--serverless=[es|oblt|security]]
```

Then, in a separate terminal, **run the tests** with:

```bash
npx playwright test --config <plugin-path>/test/scout/ui/playwright.config.ts \
  --project local \
  --grep [@ess|@svlSearch|@svlSecurity|@svlOblt|@svlChat]
```

The entry point for Scout tests is a Playwright configuration file. This configuration has no knowledge of the server setup, which is defined separately.

> **Note:** We use `--project local` to run tests against a local Elasticsearch and Kibana deployment. This requires no additional configuration on your part other than running the servers.

> The `--grep` option can be used to filter tests by tag, such as `@ess`, `@svlSearch`, `@svlSecurity`, `@svlOblt`, or `@svlChat`. If you don't use `--grep`, all tests will be run, including ones that may be incompatible with the distro you're targeting (e.g., stateful or serverless).

Alternatively, you can **start the servers and run the tests** with a single command:

```bash
node scripts/scout.js run-tests [--stateful|--serverless=[es|oblt|security]] \
  --config <plugin-path>/test/scout/ui/playwright.config.ts
```

Notice that the `run-tests` command starts the servers **and** runs the tests, unlike the `start-server` command.

When Scout starts Kibana and Elasticsearch locally, it saves the server configuration at the path `.scout/servers/local.json` and later reads it when running the tests.

You can also pass a **folder** containing tests to the `run-tests` command with the `--testFiles` flag:

```bash
node scripts/scout.js run-tests [--stateful|--serverless=[es|oblt|security]] \
  --testFiles <plugin-path>/test/scout/ui/tests/test_sub_directory
```

The `--testFiles` flag also accepts a **comma-separated list of test files**:

```bash
node scripts/scout.js run-tests [--stateful|--serverless=[es|oblt|security]] \
  --testFiles <plugin-path>/test/scout/ui/tests/your_test_spec.ts,<plugin-path>/test/scout/ui/tests/another_test_spec.ts
```

> **Important:** All paths specified in the `--testFiles` flag must be under the same Scout root directory (`scout/ui/tests`, `scout/ui/parallel_tests`, or `scout/api/tests`) and belong to the **same Playwright config** file, which the Scout CLI command will automatically discover.

To run one or more specific test files with `npx playwright test`, use the command below:

```bash
npx playwright test \
  <plugin-path>/test/scout/ui/tests/test_one.spec.ts \
  <plugin-path>/test/scout/ui/tests/test_two.spec.ts \
  --config <path/to/your/config>/playwright.config.ts \
  --project local \
  --grep [@ess|@svlSearch|@svlSecurity|@svlOblt|@svlChat]
```

Before running the command, make sure:

- Kibana and Elasticsearch are running (use the `node scripts/scout.js start-server` command).
- The test files belong to the same Playwright config file.

> **Running UI tests? Try out the headed or UI mode**
>
> You can append `--headed` to your `npx playwright test` command to see the tests running in a browser. We also **highly** encourage you to check out the Playwright UI mode for a better debugging experience.

---

## Run Scout tests on Elastic Cloud

Scout also allows you to run tests on Elastic Cloud, but you must **manually** provide the server configuration to Scout.

### ECH (Stateful)

First, open and configure `<KIBANA_ROOT>/.scout/servers/cloud_ech.json`:

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

- `cloudHostName`: The hostname of your Elastic Cloud deployment (e.g., `cloud.elastic.co`).
- `cloudUsersFilePath`: This file defines the credentials for your Elastic Cloud users. If you used FTR in the past, it's likely located at `<KIBANA_ROOT>/.ftr/role_users.json`. You will need to populate this file with the appropriate user roles and credentials.

Then, run the tests with `--project ech`:

```bash
npx playwright test --config <plugin-path>/test/scout/ui/playwright.config.ts \
  --project ech \
  --grep @ess
```

This command runs only the tests tagged with `@ess`, which target the stateful distribution.

### MKI (Serverless)

First, open and configure `<KIBANA_ROOT>/.scout/servers/cloud_mki.json`:

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
    "username": "<operator_username>",
    "password": "<operator_password>"
  }
}
```

- `projectType`: Supported project types are `es` (Elasticsearch), `security` (Security), and `oblt` (Observability).
- `cloudHostName`: The hostname of your Elastic Cloud project (e.g., `cloud.elastic.co`).
- `cloudUsersFilePath`: This file defines credentials for your Elastic Cloud users. If you used FTR in the past, it's likely located at `<KIBANA_ROOT>/.ftr/role_users.json`. You will need to populate this file with the appropriate user roles and credentials.

Then, run the tests with `--project mki`:

```bash
npx playwright test --config <plugin-path>/test/scout/ui/playwright.config.ts \
  --project mki \
  --grep [@svlSearch|@svlSecurity|@svlOblt|@svlChat]
```

Use the `--grep` option to filter serverless tests by tag, such as `@svlSearch`, `@svlSecurity`, `@svlOblt`, or `@svlChat`, to target a specific serverless distribution.

> **Note:** Use `--project ech` to run tests on ECH (Stateful) and `--project mki` to run tests on MKI (Serverless).

### Using the Scout CLI on Elastic Cloud

Alternatively, you can run tests on Elastic Cloud using the Scout CLI.

#### ECH (Stateful)

```bash
node scripts/scout.js run-tests \
  --stateful \
  --testTarget=cloud \
  --config <plugin-path>/test/scout/ui/playwright.config.ts
```

#### MKI (Serverless)

```bash
node scripts/scout.js run-tests \
  --serverless=[es|oblt|security] \
  --testTarget=cloud \
  --config <plugin-path>/test/scout/ui/playwright.config.ts
```

The supported serverless project types for the `--serverless` flag are `es` (Elasticsearch), `security` (Security), and `oblt` (Observability).

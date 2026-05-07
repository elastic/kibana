# Lens API Integrations tests

These tests are meant as integrations tests to catch unknown errors in the transform logic.

This uses the integrations dashboards in the [elastic/integrations](https://github.com/elastic/integrations) repo.

## Running tests

These tests are designed to run as jest tests pointing at json data of the integrations dashboards.

These test do **not** pull in the latest data but are run on static data store in the repo.

To update the data, run the following...

```
cd src/platform/packages/shared/kbn-lens-embeddable-utils/config_builder/tests/integrations # run from parent dir

node download_integrations_panels.js # write gzip-compressed JSON with integrations dashboards
```

This will update the `./lens_panels.json.gz` file, which is loaded by `./charts.test.ts`.

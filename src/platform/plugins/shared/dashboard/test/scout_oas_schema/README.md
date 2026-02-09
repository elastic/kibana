## Dashboard OAS Schema Validation Tests

This directory contains Scout tests for validating the Dashboard REST API OpenAPI (OAS) schema.

These tests use a **custom server configuration** that enables the OAS endpoint (`--server.oas.enabled=true`).

### How to run tests

First start the servers with the custom config:

```bash
// ESS (stateful)
node scripts/scout.js start-server --stateful --config-dir oas_schema

// Serverless
node scripts/scout.js start-server --serverless=es --config-dir oas_schema
```

Then run the tests in another terminal:

```bash
// ESS (stateful)
npx playwright test --config=src/platform/plugins/shared/dashboard/test/scout_oas_schema/api/playwright.config.ts --grep=@ess --project=local

// Serverless
npx playwright test --config=src/platform/plugins/shared/dashboard/test/scout_oas_schema/api/playwright.config.ts --grep=@svlSearch --project=local
```

### Server Configuration

The custom server config is located at:
`src/platform/packages/shared/kbn-scout/src/servers/configs/custom/oas_schema/`

It extends the default config and adds:

```
--server.oas.enabled=true
```

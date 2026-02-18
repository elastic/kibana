## Dashboard OAS Schema Validation Tests

This directory contains Scout tests for validating the Dashboard REST API OpenAPI (OAS) schema.

These tests use a **custom server configuration** that enables the OAS endpoint (`--server.oas.enabled=true`).

### How to run tests

First start the servers with the custom config:

```bash
// ESS (stateful)
node scripts/scout.js start-server --arch stateful --domain classic --serverConfigSet oas_schema

// Serverless
node scripts/scout.js start-server --arch serverless --domain search --serverConfigSet oas_schema
```

Then run the tests in another terminal:

```bash
// ESS (stateful)
npx playwright test --config=src/platform/plugins/shared/dashboard/test/scout_oas_schema/api/playwright.config.ts --grep=@local-stateful-classic --project=local

// Serverless
npx playwright test --config=src/platform/plugins/shared/dashboard/test/scout_oas_schema/api/playwright.config.ts --grep=@local-serverless-search --project=local
```

### Server Configuration

The custom server config is located at:
`src/platform/packages/shared/kbn-scout/src/servers/configs/custom/oas_schema/`

It extends the default config and adds:

```
--server.oas.enabled=true
```

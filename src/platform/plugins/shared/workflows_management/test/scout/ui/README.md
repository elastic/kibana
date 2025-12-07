## How to run tests

First start the servers:

```bash
// ESS
node scripts/scout.js start-server --stateful

// Serverless
node scripts/scout.js start-server --serverless=security
```

Then you can run the tests in another terminal:

```bash
// ESS
npx playwright test --config src/platform/plugins/shared/workflows_management/test/scout/ui/playwright.config.ts --project=local --grep @ess

// Serverless
npx playwright test --config src/platform/plugins/shared/workflows_management/test/scout/ui/playwright.config.ts --project=local --grep @svlSecurity
```

## Debug mode

To debug tests with Playwright UI:

```bash
npx playwright test --config src/platform/plugins/shared/workflows_management/test/scout/ui/playwright.config.ts --project=local --ui
```

## Watch mode

For development:

```bash
npx playwright test --config src/platform/plugins/shared/workflows_management/test/scout/ui/playwright.config.ts --project=local --watch
```

## Test results

Test results are available in `src/platform/plugins/shared/workflows_management/test/scout/ui/output`


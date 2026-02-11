# @kbn/ftr-common-functional-ui-services

Common test services for ui actions.

## Browser coverage (Chromium-only)

FTR supports collecting **browser coverage** (via Chrome DevTools Protocol Profiler)
from Chromium-based browsers (Chrome / Chromium Edge).

This can be useful to answer "what JS executed during *this* test?" in a functional test.

### Modes

#### Auto mode (default)

Enable automatic per-test coverage collection:

```bash
node scripts/functional_test_runner --config <config> --browser-coverage
# or explicitly:
node scripts/functional_test_runner --config <config> --browser-coverage=auto
```

When enabled, the `browserCoverageCollector` service will **automatically** capture one coverage
snapshot per test and write it to disk. No test modifications required.

#### Manual mode

For finer-grained control, use manual mode which only captures coverage when explicitly requested:

```bash
node scripts/functional_test_runner --config <config> --browser-coverage=manual
```

In manual mode, use the `capture()` method to wrap specific code blocks:

```ts
it('captures coverage for specific operations', async function () {
  const coverage = getService('browserCoverageCollector');

  // Setup code (not captured)
  await pageObjects.common.navigateToApp('dashboard');

  // Capture coverage for a specific operation
  const { result, outputPath } = await coverage.capture('load-dashboard', async () => {
    await pageObjects.dashboard.loadSavedDashboard('My Dashboard');
    return 'done';
  });

  // More uncaptured code...

  // Capture another operation
  await coverage.capture('apply-filter', async () => {
    await filterBar.addFilter('status', 'is', 'active');
  });
});
```

The `capture()` method also works in auto mode to produce additional granular coverage files.

### Output

Coverage files are written to:

```
target/kibana-coverage/browser/<testFileBase>.<testFileHash>.json
```

The test file hash is deterministic based on the test file path.
Each JSON file contains aggregated coverage for the test file:

- `auto`: combined coverage from all tests in the file (when in auto mode)
- `manual`: one or more labeled captures (from `capture(label, fn)`)

### Low-level API

For raw CDP profiler access (without source map resolution), use the `browser` service methods:

```ts
it('collects raw coverage', async function () {
  const browser = getService('browser');

  const { coverage } = await browser.withPreciseCoverage(
    async () => {
      expect(await browser.getCurrentUrl(true)).to.contain('/app/dashboards');
    },
    { label: 'url contains /app/dashboards' }
  );

  // `coverage` is the raw CDP response from `Profiler.takePreciseCoverage()`
  console.log(`Executed ${coverage.result.length} scripts`);
});
```

Available methods on the `browser` service:

- `browser.startPreciseCoverage(options?)` - Start the profiler
- `browser.takePreciseCoverage()` - Take a coverage snapshot
- `browser.stopPreciseCoverage()` - Stop the profiler
- `browser.withPreciseCoverage(callback, options?)` - Convenience wrapper

### Notes

- These APIs **throw** when running against non-Chromium browsers (e.g. Firefox).
- The automatic collector gracefully skips non-Chromium browsers with a warning.
- Coverage is resolved through source maps to original TypeScript/JavaScript files.
- `node_modules` and external dependencies are filtered out.

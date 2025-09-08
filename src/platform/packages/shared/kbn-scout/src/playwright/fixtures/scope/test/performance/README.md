## Performance Tracker Fixture

### Overview

`perfTrackerFixture` is a Playwright fixture designed to analyze JavaScript bundle performance and page-level performance metrics in Kibana by leveraging Chrome DevTools Protocol (CDP). It intercepts network requests, filters static bundles, and computes bundle size statistics per page load. Additionally, it collects CDP Performance Domain Metrics, allowing in-depth analysis of rendering and script execution times.

### Key Features

- Uses CDP session to monitor network requests in Playwright tests.
- Exposes `waitForJsLoad` to ensure all incoming bundle requests are fully resolved before proceeding.
- Exposes `captureBundleResponses` to start tracking network requests and collect JavaScript bundle responses.
- Exposes `collectJsBundleStats` to aggregate all captured responses by plugin, making validation easier in tests.
- Automatically attaches collected JS bundle stats as a JSON artifact in test reports, making them available in the `Playwright HTML report`.
- Captures `CDP Performance Domain Metrics`, including:
  - JavaScript Heap Usage (jsHeapUsedSize, jsHeapTotalSize)
  - CPU Execution Time (cpuTime)
  - Script Execution Time (scriptTime)
  - Layout & Rendering Performance (layoutTime, layoutCount, styleRecalcCount)
  - Frames Per Second (FPS) (fps)
  - DOM Complexity Metrics (nodesCount, documentsCount)


### Usage: capturing JS bundles on page

```ts
test.describe(
  'Discover App - Performance Metrics & Bundle Analysis',
  { tag: [...tags.DEPLOYMENT_AGNOSTIC, ...tags.PERFORMANCE] },
  () => {
    let cdp: CDPSession;

    test.beforeEach(async ({ browserAuth, page, context, perfTracker }) => {
      await browserAuth.loginAsAdmin();
      cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable');
      // load the starting page, e.g. '/app/home'
      await perfTracker.waitForJsLoad(cdp); // Ensure JS bundles are fully loaded
    });

    test('collects and validates JS Bundles loaded on page', async ({
      page,
      pageObjects,
      perfTracker,
    }) => {
      perfTracker.captureBundleResponses(cdp); // Start tracking

      // Navigate to Discover app
      await pageObjects.collapsibleNav.clickItem('Discover');
      const currentUrl = page.url();
      expect(currentUrl).toContain('app/discover#/');

      // Ensure all JS bundles are loaded
      await perfTracker.waitForJsLoad(cdp);

      // Collect and validate stats
      const stats = perfTracker.collectJsBundleStats(currentUrl);
      expect(
        stats.totalSize,
        `Total bundles size loaded on page should not exceed 3.0 MB`
      ).toBeLessThan(3 * 1024 * 1024);
      expect(stats.bundleCount, {
        message: `Total bundle chunks count loaded on page should not exceed 100`,
      }).toBeLessThan(100);
      expect(
        stats.plugins.map((p) => p.name),
        { message: 'Unexpected plugins were loaded on page' }
      ).toStrictEqual([
        'aiops',
        'discover',
        'eventAnnotation',
        'expressionXY',
        'kbn-ui-shared-deps-npm',
        'lens',
        'maps',
        'unifiedSearch',
      ]);
      // Validate individual plugin bundle sizes
      expect(stats.plugins.find((p) => p.name === 'discover')?.totalSize, {
        message: `Total 'discover' bundles size should not exceed 625 KB`,
      }).toBeLessThan(625 * 1024);
    });
```

### Uage: collecting CDP Performance metrics

```ts
test.describe(
  'Discover App - Performance Metrics & Bundle Analysis',
  { tag: [...tags.DEPLOYMENT_AGNOSTIC, ...tags.PERFORMANCE] },
  () => {
    let cdp: CDPSession;

    test.beforeEach(async ({ browserAuth, page, context, perfTracker }) => {
      await browserAuth.loginAsAdmin();
      cdp = await context.newCDPSession(page);
      // load the starting page, e.g. '/app/home' and wait for loading to finish
    });

    test('measures Performance Metrics before and after Discover load', async ({
      page,
      pageObjects,
      perfTracker,
    }) => {
      const beforeMetrics = await perfTracker.capturePagePerformanceMetrics(cdp);

      // Navigate to Discover app
      await pageObjects.collapsibleNav.clickItem('Discover');
      await page.waitForLoadingIndicatorHidden();
      const currentUrl = page.url();
      expect(currentUrl).toContain('app/discover#/');

      await pageObjects.discover.waitForHistogramRendered();

      const afterMetrics = await perfTracker.capturePagePerformanceMetrics(cdp);
      const perfStats = perfTracker.collectPagePerformanceStats(
        currentUrl,
        beforeMetrics,
        afterMetrics
      );

      expect(perfStats.cpuTime.diff).toBeLessThan(1.5); // CPU time (seconds) usage during page navigation
      expect(perfStats.scriptTime.diff).toBeLessThan(0.4); // Additional time (seconds) spent executing JS scripts
      expect(perfStats.layoutTime.diff).toBeLessThan(0.06); // Total layout computation time (seconds)
    });
```

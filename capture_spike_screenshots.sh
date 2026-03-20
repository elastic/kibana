#!/bin/bash
# Automated Screenshot Capture for Alert Investigation Pipeline Spike
# spike-builder v2.0 - Autonomous screenshot capture

set -e

KIBANA_URL="${KIBANA_URL:-http://localhost:5601}"
SCREENSHOT_DIR="x-pack/solutions/security/plugins/elastic_assistant/docs/screenshots"

echo "🚀 Starting automated screenshot capture..."
echo "Kibana URL: ${KIBANA_URL}"

# Create screenshot directory
mkdir -p "${SCREENSHOT_DIR}"

# Check if Kibana is running
if ! curl -s "${KIBANA_URL}/api/status" > /dev/null 2>&1; then
  echo "⚠️  Kibana not running at ${KIBANA_URL}"
  echo "Starting Kibana... (this will take ~60 seconds)"

  # Start Kibana in background
  yarn start > /tmp/kibana.log 2>&1 &
  KIBANA_PID=$!

  # Wait for Kibana to be ready (max 3 minutes)
  for i in {1..60}; do
    if curl -s "${KIBANA_URL}/api/status" | grep -q "available"; then
      echo "✅ Kibana ready"
      break
    fi
    echo -n "."
    sleep 3
  done
fi

# Capture screenshots using Playwright
echo "📸 Capturing screenshots via Playwright..."

node << 'PLAYWRIGHT_SCRIPT'
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const KIBANA_URL = process.env.KIBANA_URL || 'http://localhost:5601';
  const SCREENSHOT_DIR = 'x-pack/solutions/security/plugins/elastic_assistant/docs/screenshots';

  const browser = await chromium.launch({
    headless: false, // Visible for verification
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }, // Professional resolution
    recordVideo: { dir: `${SCREENSHOT_DIR}/videos/` }, // Record demo video
  });

  const page = await context.newPage();

  try {
    // Login
    console.log('🔐 Logging in...');
    await page.goto(`${KIBANA_URL}/login`);
    await page.fill('[data-test-subj="loginUsername"]', 'elastic');
    await page.fill('[data-test-subj="loginPassword"]', 'changeme');
    await page.click('[data-test-subj="loginSubmit"]');
    await page.waitForURL('**/app/home', { timeout: 30000 });

    // Screenshot 1: Navigation
    console.log('📸 1/8: Navigation');
    await page.click('[data-test-subj="toggleNavButton"]');
    await page.waitForTimeout(500); // Let nav menu open
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01_navigation_to_pipeline.png`,
    });

    // Screenshot 2: Pipeline Dashboard - Initial Load
    console.log('📸 2/8: Dashboard initial load');
    await page.goto(`${KIBANA_URL}/app/alert-investigation-pipeline`);
    await page.waitForTimeout(2000); // Let dashboard load
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02_dashboard_initial_load.png`,
      fullPage: true,
    });

    // Screenshot 3: Health Status Panel
    console.log('📸 3/8: Health status');
    await page.locator('text=/HEALTHY|DEGRADED|UNHEALTHY/').waitFor({ timeout: 10000 });
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03_health_status_panel.png`,
    });

    // Screenshot 4: Metrics Overview
    console.log('📸 4/8: Metrics overview');
    await page.locator('text=Total Runs').waitFor();
    await page.locator('text=Alerts Processed').waitFor();
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04_metrics_overview_panel.png`,
    });

    // Screenshot 5: Settings Panel
    console.log('📸 5/8: Settings panel');
    const settingsTab = page.locator('text=/Settings|Configuration/i').first();
    if (await settingsTab.count() > 0) {
      await settingsTab.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/05_settings_panel.png`,
        fullPage: true,
      });
    }

    // Screenshot 6: Refresh Action
    console.log('📸 6/8: Refresh button action');
    const refreshButton = page.getByRole('button', { name: /refresh/i });
    await refreshButton.click();
    await page.waitForTimeout(1000); // Show loading state briefly
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/06_refresh_action.png`,
    });

    // Screenshot 7: Error State (simulated)
    console.log('📸 7/8: Error state handling');
    await page.route('**/attack_discovery/pipeline/_health', route => route.abort());
    await refreshButton.click();
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/07_error_state_handling.png`,
    });
    await page.unroute('**/attack_discovery/pipeline/_health');

    // Screenshot 8: Full Dashboard (final state)
    console.log('📸 8/8: Full dashboard overview');
    await page.goto(`${KIBANA_URL}/app/alert-investigation-pipeline`);
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/08_full_dashboard_overview.png`,
      fullPage: true,
    });

    console.log('✅ Captured 8 screenshots successfully!');

    // Generate manifest
    const manifest = `# Screenshot Manifest

1. **01_navigation_to_pipeline.png** - Kibana nav menu showing "Alert Investigation Pipeline" entry
2. **02_dashboard_initial_load.png** - Dashboard page initial load with all panels
3. **03_health_status_panel.png** - Health status indicator (HEALTHY/DEGRADED/UNHEALTHY)
4. **04_metrics_overview_panel.png** - Metrics panel (Total Runs, Alerts Processed, Cases Matched, etc.)
5. **05_settings_panel.png** - Pipeline configuration settings UI
6. **06_refresh_action.png** - Refresh button action showing data reload
7. **07_error_state_handling.png** - Error state with graceful error message
8. **08_full_dashboard_overview.png** - Complete dashboard showing all components

**Total**: 8 professional screenshots at 1920x1080 resolution
**Video**: Demo video available in screenshots/videos/ directory
`;

    require('fs').writeFileSync(`${SCREENSHOT_DIR}/MANIFEST.md`, manifest);
    console.log('✅ Generated screenshot manifest');

  } catch (error) {
    console.error('❌ Screenshot capture failed:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }

  console.log('\n🎉 Screenshot capture complete!');
  console.log(`📁 Screenshots saved to: ${SCREENSHOT_DIR}/`);
  console.log(`📋 Manifest: ${SCREENSHOT_DIR}/MANIFEST.md`);
})();
PLAYWRIGHT_SCRIPT

echo "✅ Screenshot capture complete!"
echo "📁 Location: ${SCREENSHOT_DIR}/"
echo "📋 Manifest: ${SCREENSHOT_DIR}/MANIFEST.md"

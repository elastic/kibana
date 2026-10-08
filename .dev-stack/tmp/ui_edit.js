const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const K = 'http://localhost:5611';
  await page.goto(`${K}/login`);
  await page.fill('[data-test-subj="loginUsername"]', 'elastic');
  await page.fill('[data-test-subj="loginPassword"]', 'changeme');
  await page.click('[data-test-subj="loginSubmit"]');
  await page.waitForURL(/app/, { timeout: 120000 });
  for (const value of ['Edited in the UI.', '']) {
    await page.goto(`${K}/app/management/insightsAndAlerting/triggersActionsConnectors/connectors/ui-webhook`);
    const desc = page.locator('[data-test-subj="connectorDescriptionInput"]');
    await desc.waitFor({ timeout: 180000 });
    console.log('prefilled:', JSON.stringify(await desc.inputValue()));
    await desc.fill(value);
    await page.click('[data-test-subj="edit-connector-flyout-save-btn"]');
    await page.waitForTimeout(3000);
    const res = await page.request.get(`${K}/api/actions/connector/ui-webhook`);
    console.log('after save:', JSON.stringify((await res.json()).description));
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });

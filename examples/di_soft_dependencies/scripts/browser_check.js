/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Loads a Kibana page with basic auth and prints what each example plugin's browser half saw.
// Usage: node browser_check.js <port> <expectedPluginCount>
const { chromium } = require('playwright');

const [port, expected] = [process.argv[2] ?? '5611', Number(process.argv[3] ?? 4)];

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    extraHTTPHeaders: {
      Authorization: `Basic ${Buffer.from('elastic:changeme').toString('base64')}`,
    },
  });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleLines = [];
  page.on('pageerror', (error) => pageErrors.push(error.message.split('\n')[0]));
  page.on('console', (message) => {
    const text = message.text();
    if (/diSoftDeps|soft|Ambiguous/i.test(text)) consoleLines.push(`${message.type()}: ${text}`);
  });

  await page.goto(`http://localhost:${port}/app/home`, { waitUntil: 'domcontentloaded' });
  let status = 'ok';
  try {
    await page.waitForFunction(
      (count) => window.__diSoftDeps && Object.keys(window.__diSoftDeps).length >= count,
      expected,
      { timeout: 180000 }
    );
  } catch (e) {
    status = `timeout waiting for ${expected} plugins`;
  }
  const result = await page.evaluate(() => window.__diSoftDeps ?? null);
  process.stdout.write(
    `${JSON.stringify({ status, url: page.url(), result, pageErrors, consoleLines }, null, 2)}\n`
  );
  await browser.close();
})();

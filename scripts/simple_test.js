/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable no-restricted-syntax */

require('../src/setup_node_env');
var playwright = require('playwright');
var axios = require('axios');

function extractCookieValue(authResponse) {
  return authResponse.headers['set-cookie']?.[0].toString().split(';')[0].split('sid=')[1] ?? '';
}

async function getCookie(baseUrl, username, password) {
  var loginUrl = `${baseUrl}/internal/security/login`;
  var provider = 'basic';

  var authResponse = await axios.request({
    url: loginUrl,
    method: 'post',
    data: {
      providerType: 'basic',
      providerName: provider,
      currentURL: `${baseUrl}/login?next=%2F`,
      params: { username, password },
    },
    headers: {
      'content-type': 'application/json',
      'kbn-version': '8.6.0-SNAPSHOT',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
    },
    validateStatus: () => true,
    maxRedirects: 0,
  });

  var cookie = extractCookieValue(authResponse);
  if (cookie) {
    console.log('captured auth cookie');
  } else {
    console.log(authResponse);

    throw new Error(`failed to determine auth cookie`);
  }

  return {
    name: 'sid',
    value: cookie,
    url: baseUrl,
  };
}

var sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForVisualizations(page, visCount) {
  try {
    await page.waitForFunction(function renderCompleted(cnt) {
      var visualizations = Array.from(document.querySelectorAll('[data-rendering-count]'));
      var allVisLoaded = visualizations.length === cnt;
      return allVisLoaded
        ? visualizations.every((e) => e.getAttribute('data-render-complete') === 'true')
        : false;
    }, visCount);
  } catch (err) {
    var loadedVis = await page.$$('[data-rendering-count]');
    var renderedVis = await page.$$('[data-rendering-count][data-render-complete="true"]');
    console.log(
      `'waitForVisualizations' failed: loaded - ${loadedVis.length}, rendered - ${renderedVis.length}, expected - ${visCount}`
    );
    throw err;
  }
}

async function simpleTest() {
  var baseUrl = process.env.KIBANA_BASE_URL;
  var browser = await playwright.chromium.launch({ headless: true, timeout: 60_000 });
  var context = await browser.newContext({ bypassCSP: true });
  var cookie = await getCookie(baseUrl, 'elastic', 'changeme');
  await context.addCookies([cookie]);
  var page = await context.newPage();
  page.on('console', (msg) => console.log(msg.text()));
  var client = await context.newCDPSession(page);
  await client.send('Network.emulateNetworkConditions', {
    latency: 100,
    downloadThroughput: 750_000,
    uploadThroughput: 750_000,
    offline: false,
  });
  await client.send('Network.clearBrowserCache');
  await client.send('Network.setCacheDisabled', { cacheDisabled: true });
  await page.goto(`${baseUrl}/app/dashboards#/view/92b143a0-2e9c-11ed-b1b6-a504560b392c`);
  await waitForVisualizations(page, 1);
  await sleep(5000);
  await page.close();
  await context.close();
  await browser.close();
}

simpleTest();

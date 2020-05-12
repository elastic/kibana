/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';
import puppeteer from 'puppeteer';
import { ToolingLog, REPO_ROOT } from '@kbn/dev-utils';
import { resolve } from 'path';

const statsPath = resolve(REPO_ROOT, 'target/performance_stats');

export async function navigateToKibana(
  log: ToolingLog,
  appConfig: { url: string; login: string; password: string }
) {
  const browser = await puppeteer.launch({ headless: false });
  const results: Array<{ url: any; time: any; size: string; eventSize: string }> = [];
  const page = await browser.newPage();

  const client = await page.target().createCDPSession();
  await client.send('Network.enable');
  await client.send('Performance.enable');
  await page.tracing.start({ path: resolve(statsPath, 'trace.json') });
  const devToolsResponses = new Map();

  client.on('Network.responseReceived', event => {
    devToolsResponses.set(event.requestId, event.response);
  });

  client.on('Network.loadingFinished', event => {
    const response = devToolsResponses.get(event.requestId);

    if (/^.*.[js|css]$/.test(response.url)) {
      const encodedBodyLength = event.encodedDataLength - response.encodedDataLength;
      results.push({
        url: response.url,
        time: response.timing ? response.timing.requestTime : 0,
        size: (encodedBodyLength / 1024).toFixed(1),
        eventSize: (event.encodedDataLength / 1024).toFixed(1),
      });
    }
  });

  client.on(
    'Network.responseReceived',
    async ({ requestId, loaderId, timestamp, type, response, frameId }: any) => {
      log.debug(response.url);
    }
  );

  page.setDefaultNavigationTimeout(0);
  log.debug(`goto ${appConfig.url}`);
  await page.goto(appConfig.url, {
    waitUntil: 'networkidle0',
  });
  log.debug(`log in to the app..`);
  await page.type('[data-test-subj="loginUsername"]', appConfig.login);
  await page.type('[data-test-subj="loginPassword"]', appConfig.password);
  await page.click('[data-test-subj="loginSubmit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle0' });

  await page.tracing.stop();
  await browser.close();

  return results;
}

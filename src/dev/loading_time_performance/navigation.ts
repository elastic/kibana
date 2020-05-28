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
import { ToolingLog } from '@kbn/dev-utils';
import { LoadingFinishedEvent, ResponseReceivedEvent } from './event';

export async function navigateToApp(
  log: ToolingLog,
  options: { headless: boolean; appConfig: { url: string; login: string; password: string } }
) {
  const { headless, appConfig } = options;
  const browser = await puppeteer.launch({ headless });
  const devToolsResponses = new Map<string, any>();
  const apps = [
    'kibana',
    'canvas', // +1
    'maps', // +16
    'timelion', // +1
    'apm', // +1
    'uptime', // +1
  ].map((app) => `/app/${app}`);

  for (const url of ['/login', ...apps]) {
    const page = await browser.newPage();
    page.setCacheEnabled(false);
    page.setDefaultNavigationTimeout(0);
    const frameResponses = new Map();
    devToolsResponses.set(url, frameResponses);

    const client = await page.target().createCDPSession();
    await client.send('Network.enable');

    client.on('Network.responseReceived', (event: ResponseReceivedEvent) => {
      frameResponses.set(event.requestId, { responseRecieved: event });
    });

    client.on('Network.loadingFinished', (event: LoadingFinishedEvent) => {
      frameResponses.get(event.requestId).loadingFinished = event;
    });

    const fullURL = appConfig.url + url;
    log.debug(`goto ${fullURL}`);
    await page.goto(fullURL, {
      waitUntil: 'networkidle0',
    });

    if (url === '/login') {
      log.debug(`log in to the app..`);
      await page.type('[data-test-subj="loginUsername"]', appConfig.login);
      await page.type('[data-test-subj="loginPassword"]', appConfig.password);
      await page.click('[data-test-subj="loginSubmit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
    }

    await page.close();
  }

  await browser.close();

  return devToolsResponses;
}

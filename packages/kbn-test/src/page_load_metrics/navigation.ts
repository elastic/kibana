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

import Fs from 'fs';
import Url from 'url';
import puppeteer from 'puppeteer';
import { resolve } from 'path';
import { ToolingLog } from '@kbn/dev-utils';
import { ResponseReceivedEvent, DataReceivedEvent } from './event';

export interface NavigationOptions {
  headless: boolean;
  appConfig: { url: string; username: string; password: string };
  screenshotsDir: string;
}

export type NavigationResults = Map<string, Map<string, FrameResponse>>;

interface FrameResponse {
  url: string;
  dataLength: number;
}

function joinPath(pathA: string, pathB: string) {
  return `${pathA.endsWith('/') ? pathA.slice(0, -1) : pathA}/${
    pathB.startsWith('/') ? pathB.slice(1) : pathB
  }`;
}

export function createUrl(path: string, url: string) {
  const baseUrl = Url.parse(url);
  return Url.format({
    protocol: baseUrl.protocol,
    hostname: baseUrl.hostname,
    port: baseUrl.port,
    pathname: joinPath(baseUrl.pathname || '', path),
  });
}

async function loginToKibana(
  log: ToolingLog,
  browser: puppeteer.Browser,
  options: NavigationOptions
) {
  log.debug(`log in to the app..`);
  const page = await browser.newPage();
  const loginUrl = createUrl('/login', options.appConfig.url);
  await page.goto(loginUrl, {
    waitUntil: 'networkidle0',
  });
  await page.type('[data-test-subj="loginUsername"]', options.appConfig.username);
  await page.type('[data-test-subj="loginPassword"]', options.appConfig.password);
  await page.click('[data-test-subj="loginSubmit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  await page.close();
}

export async function navigateToApps(log: ToolingLog, options: NavigationOptions) {
  const browser = await puppeteer.launch({ headless: options.headless, args: ['--no-sandbox'] });
  const devToolsResponses: NavigationResults = new Map();
  const apps = [
    { path: '/app/discover', locator: '[data-test-subj="discover-sidebar"]' },
    { path: '/app/home', locator: '[data-test-subj="homeApp"]' },
    { path: '/app/canvas', locator: '[data-test-subj="create-workpad-button"]' },
    { path: '/app/maps', locator: '[title="Maps"]' },
    { path: '/app/apm', locator: '[data-test-subj="apmMainContainer"]' },
  ];

  await loginToKibana(log, browser, options);

  await Promise.all(
    apps.map(async (app) => {
      const page = await browser.newPage();
      page.setCacheEnabled(false);
      page.setDefaultNavigationTimeout(0);
      const frameResponses = new Map<string, FrameResponse>();
      devToolsResponses.set(app.path, frameResponses);

      const client = await page.target().createCDPSession();
      await client.send('Network.enable');

      function getRequestData(requestId: string) {
        if (!frameResponses.has(requestId)) {
          frameResponses.set(requestId, { url: '', dataLength: 0 });
        }

        return frameResponses.get(requestId)!;
      }

      client.on('Network.responseReceived', (event: ResponseReceivedEvent) => {
        getRequestData(event.requestId).url = event.response.url;
      });

      client.on('Network.dataReceived', (event: DataReceivedEvent) => {
        getRequestData(event.requestId).dataLength += event.dataLength;
      });

      const url = createUrl(app.path, options.appConfig.url);
      log.debug(`goto ${url}`);
      await page.goto(url, {
        waitUntil: 'networkidle0',
      });

      let readyAttempt = 0;
      let selectorFound = false;
      while (!selectorFound) {
        readyAttempt += 1;
        try {
          await page.waitForSelector(app.locator, { timeout: 5000 });
          selectorFound = true;
        } catch (error) {
          log.error(
            `Page '${app.path}' was not loaded properly, unable to find '${
              app.locator
            }', url: ${page.url()}`
          );

          if (readyAttempt < 6) {
            continue;
          }

          const failureDir = resolve(options.screenshotsDir, 'failure');
          const screenshotPath = resolve(
            failureDir,
            `${app.path.slice(1).split('/').join('_')}_navigation.png`
          );
          Fs.mkdirSync(failureDir, { recursive: true });

          await page.bringToFront();
          await page.screenshot({
            path: screenshotPath,
            type: 'png',
            fullPage: true,
          });
          log.debug(`Saving screenshot to ${screenshotPath}`);

          throw new Error(`Page load timeout: ${app.path} not loaded after 30 seconds`);
        }
      }

      await page.close();
    })
  );

  await browser.close();

  return devToolsResponses;
}

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

import Url from 'url';

import { run, createFlagError } from '@kbn/dev-utils';
import { resolve, basename } from 'path';
import { capturePageLoadMetrics } from './capture_page_load_metrics';

const defaultScreenshotsDir = resolve(__dirname, 'screenshots');

export function runPageLoadMetricsCli() {
  run(
    async ({ flags, log }) => {
      const kibanaUrl = flags['kibana-url'];
      if (!kibanaUrl || typeof kibanaUrl !== 'string') {
        throw createFlagError('Expect --kibana-url to be a string');
      }

      const parsedUrl = Url.parse(kibanaUrl);

      const [username, password] = parsedUrl.auth
        ? parsedUrl.auth.split(':')
        : [flags.username, flags.password];

      if (typeof username !== 'string' || typeof password !== 'string') {
        throw createFlagError(
          'Mising username and/or password, either specify in --kibana-url or pass --username and --password'
        );
      }

      const headless = !flags.head;

      const screenshotsDir = flags.screenshotsDir || defaultScreenshotsDir;

      if (typeof screenshotsDir !== 'string' || screenshotsDir === basename(screenshotsDir)) {
        throw createFlagError('Expect screenshotsDir to be valid path string');
      }

      const metrics = await capturePageLoadMetrics(log, {
        headless,
        appConfig: {
          url: kibanaUrl,
          username,
          password,
        },
        screenshotsDir,
      });
      for (const metric of metrics) {
        log.info(`${metric.id}: ${metric.value}`);
      }
    },
    {
      description: `Loads several pages with Puppeteer to capture the size of assets`,
      flags: {
        string: ['kibana-url', 'username', 'password', 'screenshotsDir'],
        boolean: ['head'],
        default: {
          username: 'elastic',
          password: 'changeme',
          debug: true,
          screenshotsDir: defaultScreenshotsDir,
        },
        help: `
          --kibana-url       Url for Kibana we should connect to, can include login info
          --head             Run puppeteer with graphical user interface
          --username         Set username, defaults to 'elastic'
          --password         Set password, defaults to 'changeme'
          --screenshotsDir   Set screenshots directory, defaults to '${defaultScreenshotsDir}'
        `,
      },
    }
  );
}

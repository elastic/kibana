/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/repo-info';
import { ToolingLog } from '@kbn/tooling-log';
import chalk from 'chalk';
import fs from 'fs';
import fetch from 'node-fetch';
import path from 'path';
import {
  type ChromeVersion,
  type ChromiumCommit,
  type ChromiumDashVersionType,
  ChromiumDashVersionSchema,
  forkCompatibilityMap,
  PuppeteerPackageSchema,
  type PuppeteerPackageType,
  type PuppeteerRelease,
} from './util';

async function getPuppeteerRelease(log: ToolingLog): Promise<PuppeteerRelease> {
  // open node_modules/puppeteer/package.json
  const { version }: PuppeteerPackageType = JSON.parse(
    fs.readFileSync(path.resolve(REPO_ROOT, 'node_modules', 'puppeteer', 'package.json'), 'utf8')
  );

  PuppeteerPackageSchema.validate({ version });

  if (version == null) {
    throw new Error(
      'Could not get the Puppeteer version! Check node_modules/puppteer/package.json'
    );
  }
  const puppeteerRelease = forkCompatibilityMap[version] ?? version;

  log.info(`Kibana is using Puppeteer ${version} (${puppeteerRelease})`);
  return puppeteerRelease;
}

async function getChromeVersion(
  kibanaPuppeteerVersion: PuppeteerRelease,
  log: ToolingLog
): Promise<ChromeVersion> {
  const url = `https://raw.githubusercontent.com/puppeteer/puppeteer/puppeteer-v${kibanaPuppeteerVersion}/packages/puppeteer-core/src/revisions.ts`;
  let body: string;
  try {
    log.info(`Fetching code from Puppeteer source: ${url}`);
    const rawSource = await fetch(url);
    body = await rawSource.text();
  } catch (err) {
    log.error(err);
    throw new Error(`Could not fetch ${url}. Check the URL in a browser and try again.`);
  }

  let version: ChromeVersion | undefined;
  const lines = body.split('\n');
  let cursor = lines.length;
  while (--cursor >= 0) {
    // look for the line of code matching `  chrome: '113.0.5672.63',`
    const test = lines[cursor].match(/^\s+chrome: '(\S+)',$/);
    if (test != null) {
      log.debug(`Parsed Chrome version from source text: \`${lines[cursor]}\``);
      [, version] = test;
      break;
    }
  }

  if (version == null) {
    throw new Error(
      `Could not find a Chrome version listed in Puppeteer source! Check ${url} in a browser`
    );
  }

  log.info(`Found Chrome version ${version} from Puppeteer ${kibanaPuppeteerVersion}`);
  return version;
}

async function getChromiumCommit(version: ChromeVersion, log: ToolingLog): Promise<ChromiumCommit> {
  const url = `https://chromiumdash.appspot.com/fetch_version?version=${version}`;
  log.info(`Fetching ${url}`);
  const fetchResponse = await fetch(url);
  const chromeJson: ChromiumDashVersionType = await fetchResponse.json();

  const {
    chromium_main_branch_position: revision,
    hashes: { chromium: commit },
  } = chromeJson;

  ChromiumDashVersionSchema.validate({
    chromium_main_branch_position: revision,
    hashes: { chromium: commit },
  });

  if (commit == null) {
    throw new Error(`Could not find a Chromium commit! Check ${url} in a browser.`);
  }

  log.info(`Found Chromium revision ${revision} from version ${version}.`);
  log.info(`Found Chromium commit   ${commit} from revision ${revision}.`);
  return commit;
}

run(
  async ({
    log,
    flags: {
      _: [puppeteerVersionArg],
    },
  }) => {
    try {
      let puppeteerVersion: PuppeteerRelease;
      if (puppeteerVersionArg) {
        puppeteerVersion = puppeteerVersionArg;
      } else {
        puppeteerVersion = await getPuppeteerRelease(log);
      }

      const chromeVersion = await getChromeVersion(puppeteerVersion, log);
      await getChromiumCommit(chromeVersion, log);
    } catch (err) {
      log.error(err);
    }
  },
  {
    description: chalk`
      Display the Chromium git commit that correlates to a given Puppeteer release.

      -  node scripts/chromium_version 5.5.0  {dim # gets the Chromium commit for Puppeteer v5.5.0}
      -  node scripts/chromium_version       {dim  # gets the Chromium commit for the Kibana dependency version of Puppeteer}

      You can use https://omahaproxy.appspot.com/ to look up the Chromium release that first shipped with that commit.
    `,
  }
);

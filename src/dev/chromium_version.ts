/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { run, ToolingLog } from '@kbn/dev-utils';
import { REPO_ROOT } from '@kbn/utils';
import chalk from 'chalk';
import cheerio from 'cheerio';
import fs from 'fs';
import fetch from 'node-fetch';
import path from 'path';

type PuppeteerRelease = string;
type ChromiumRevision = string;
type ChromiumCommit = string;

// We forked the Puppeteer node module for Kibana,
// So we need to translate OUR version to the official Puppeteer Release
const forkCompatibilityMap: Record<string, PuppeteerRelease> = {
  '5.4.1-patch.1': '5.4.1',
};

async function getPuppeteerRelease(log: ToolingLog): Promise<PuppeteerRelease> {
  // open node_modules/puppeteer/package.json
  const puppeteerPackageJson = JSON.parse(
    fs.readFileSync(path.resolve(REPO_ROOT, 'node_modules', 'puppeteer', 'package.json'), 'utf8')
  );
  const { version } = puppeteerPackageJson;
  if (version == null) {
    throw new Error(
      'Could not get the Puppeteer version! Check node_modules/puppteer/package.json'
    );
  }
  const puppeteerRelease = forkCompatibilityMap[version] ?? version;

  log.info(`Kibana is using Puppeteer ${version} (${puppeteerRelease})`);
  return puppeteerRelease;
}

async function getChromiumRevision(
  kibanaPuppeteerVersion: PuppeteerRelease,
  log: ToolingLog
): Promise<ChromiumRevision> {
  const url = `https://raw.githubusercontent.com/puppeteer/puppeteer/v${kibanaPuppeteerVersion}/src/revisions.ts`;
  let body: string;
  try {
    log.info(`Fetching code from Puppeteer source: ${url}`);
    const rawSource = await fetch(url);
    body = await rawSource.text();
  } catch (err) {
    log.error(err);
    throw new Error(`Could not fetch ${url}. Check the URL in a browser and try again.`);
  }

  let revision: ChromiumRevision | undefined;
  const lines = body.split('\n');
  let cursor = lines.length;
  while (--cursor >= 0) {
    // look for the line of code matching `  chromium: '0123456',`
    const test = lines[cursor].match(/^\s+chromium: '(\S+)',$/);
    if (test != null) {
      log.debug(`Parsed revision from source text: \`${lines[cursor]}\``);
      [, revision] = test;
      break;
    }
  }

  if (revision == null) {
    throw new Error(
      `Could not find a Chromium revision listed in Puppeteer source! Check ${url} in a browser`
    );
  }

  log.info(`Found Chromium revision ${revision} from Puppeteer ${kibanaPuppeteerVersion}`);
  return revision;
}

async function getChromiumCommit(
  revision: ChromiumRevision,
  log: ToolingLog
): Promise<ChromiumCommit> {
  const url = `https://crrev.com/${revision}`;
  log.info(`Fetching ${url}`);
  const pageText = await fetch(url);
  const $ = cheerio.load(await pageText.text());

  // get the commit from the page title
  let commit: ChromiumCommit | null = null;
  const matches = $('title')
    .text()
    .match(/\S{40}/);
  if (matches != null) {
    log.debug(`Parsed commit hash from page title: \`${$('title').text()}\``);
    [commit] = matches;
  }

  if (commit == null) {
    throw new Error(`Could not find a Chromium commit! Check ${url} in a browser.`);
  }

  log.info(`Found Chromium commit ${commit} from revision ${revision}.`);
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

      const chromiumRevision = await getChromiumRevision(puppeteerVersion, log);
      await getChromiumCommit(chromiumRevision, log);
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execSync, spawnSync } from 'child_process';

export async function prepareChrome() {
  const whichOut = execSync('which google-chrome-beta', { encoding: 'utf8' }).toString().trim();
  if (whichOut) process.env.TEST_BROWSER_BINARY_PATH = whichOut;

  const json = await fetch(
    'https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions.json'
  ).then((response) => response.json());

  const version = json?.channels?.Beta?.version;
  if (version) process.env.CHROMEDRIVER_VERSION = String(version);
  process.env.DETECT_CHROMEDRIVER_VERSION = 'false';

  try {
    spawnSync('node', ['node_modules/chromedriver/install.js', '--chromedriver-force-download'], {
      stdio: 'inherit',
    });
  } catch (e) {
    // ignore
  }

  try {
    execSync(
      `buildkite-agent annotate --style info --context chrome-beta "This build uses Google Chrome Beta @ ${
        process.env.CHROMEDRIVER_VERSION || ''
      }"`,
      { stdio: 'ignore' }
    );
  } catch (e) {
    // ignore
  }
}

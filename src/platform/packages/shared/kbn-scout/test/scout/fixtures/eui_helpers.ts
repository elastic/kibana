/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ScoutLogger } from '../../../src/common';
import type { ScoutPage } from '../../../src/playwright';

const getEuiVersion = () => {
  const packageJsonPath = path.join(REPO_ROOT, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  const rawVersion = packageJson.dependencies['@elastic/eui'];
  // Remove semver prefixes like ^, ~, >=, etc. to get clean version number
  let cleanVersion = rawVersion.replace(/^[\^~>=<]*/, '');
  // Remove additional version suffixes like -backport.0, -amsterdam.0, etc.
  cleanVersion = cleanVersion.replace(/-[a-zA-Z]+\.\d+$/, '');
  return cleanVersion;
};

export const getEuiBaseUrlWithVersion = () => {
  const currentVersion = getEuiVersion();
  // Basic validation - package.json should have valid version
  if (!currentVersion) {
    throw new Error('EUI version not found in package.json');
  }
  const baseUrl = `https://eui.elastic.co/v${currentVersion}/`;
  return baseUrl;
};

export const navigateToEuiTestPage = async (page: ScoutPage, route: string, log: ScoutLogger) => {
  const euiBaseUrl = getEuiBaseUrlWithVersion();
  const url = new URL(route, euiBaseUrl).toString();

  // Validate that version is preserved in the final URL
  const versionMatch = url.match(/\/v(\d+\.\d+\.\d+)\//);
  if (!versionMatch) {
    throw new Error(`Version not found in constructed URL: ${url}`);
  }

  log.info(`Navigating to EUI test page: ${url}`);
  await page.goto(url);
  const acceptButton = page.getByRole('button', { name: 'Accept' });
  if (await acceptButton.isVisible({ timeout: 2500 })) {
    await acceptButton.click();
  }
};

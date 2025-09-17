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
import type { ScoutPage } from '../../src/playwright';

const getEuiVersion = () => {
  const packageJsonPath = path.join(REPO_ROOT, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  return packageJson.dependencies['@elastic/eui'];
};

export const getEuiBaseUrlWithVersion = () => {
  const currentVersion = getEuiVersion();
  return `https://eui.elastic.co/v${currentVersion}`;
};

export const navigateToEuiTestPage = async (page: ScoutPage, route: string) => {
  const euiBaseUrl = getEuiBaseUrlWithVersion();
  const url = new URL(route, euiBaseUrl).toString();
  await page.goto(url);
  const acceptButton = page.getByRole('button', { name: 'Accept' });
  if (await acceptButton.isVisible({ timeout: 2500 })) {
    await acceptButton.click();
  }
};

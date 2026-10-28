/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, Page, Response } from '@playwright/test';
import type { PathOptions } from '../../../../../common/services/kibana_url';

// Covers bundle download, plugin start and first render: `navigationTimeout` (20s) + `actionTimeout` (10s).
const DEFAULT_APP_READY_TIMEOUT_MS = 30_000;

export type GotoAppOptions = PathOptions &
  NonNullable<Parameters<Page['goto']>[1]> & {
    /**
     * Element that proves the app is usable. When set, navigation resolves on `commit` instead of
     * the browser `load` event, and this locator becomes the readiness gate.
     */
    readyWhen?: Locator;
    /**
     * Time to wait for `readyWhen` to become visible. Defaults to 30s.
     */
    readyTimeout?: number;
  };

/** Navigates to a Kibana app URL, optionally gating on an app-specific readiness locator. */
export const navigateToApp = async (
  page: Page,
  buildAppUrl: (pathOptions: PathOptions) => string,
  options: GotoAppOptions = {}
): Promise<Response | null> => {
  const {
    params,
    hash,
    readyWhen,
    readyTimeout = DEFAULT_APP_READY_TIMEOUT_MS,
    ...gotoOptions
  } = options;
  const url = buildAppUrl({ params, hash });

  if (!readyWhen) {
    return page.goto(url, gotoOptions);
  }

  const response = await page.goto(url, { waitUntil: 'commit', ...gotoOptions });
  await readyWhen.waitFor({ state: 'visible', timeout: readyTimeout });
  return response;
};

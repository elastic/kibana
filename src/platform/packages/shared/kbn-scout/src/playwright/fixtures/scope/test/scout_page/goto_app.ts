/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test } from '@playwright/test';
import type { Locator, Page, Response } from '@playwright/test';
import type { PathOptions } from '../../../../../common/services/kibana_url';

// Mirror the Playwright defaults Scout sets in `create_config.ts`, for a project that leaves
// either unset.
const FALLBACK_NAVIGATION_TIMEOUT_MS = 20_000;
const FALLBACK_ACTION_TIMEOUT_MS = 10_000;

/**
 * Budget for the readiness gate, covering bundle download, plugin start and first render. Read from
 * the running project so the Cloud projects' raised `navigationTimeout` reaches the gate too: a
 * cold remote bootstrap gets the budget its project asks for instead of the local-stack value.
 */
const resolveAppReadyTimeout = (): number => {
  const { navigationTimeout, actionTimeout } = test.info().project.use;
  return (
    (navigationTimeout ?? FALLBACK_NAVIGATION_TIMEOUT_MS) +
    (actionTimeout ?? FALLBACK_ACTION_TIMEOUT_MS)
  );
};

export type GotoAppOptions = PathOptions &
  NonNullable<Parameters<Page['goto']>[1]> & {
    /**
     * Element that proves the app is usable. When set, navigation resolves on `commit` instead of
     * the browser `load` event, and this locator becomes the readiness gate.
     */
    readyWhen?: Locator;
    /**
     * Time to wait for `readyWhen` to become visible. Defaults to the running project's
     * `navigationTimeout` + `actionTimeout`: 30s locally, 55s on the Cloud projects.
     */
    readyTimeout?: number;
  };

/** Navigates to a Kibana app URL, optionally gating on an app-specific readiness locator. */
export const navigateToApp = async (
  page: Page,
  buildAppUrl: (pathOptions: PathOptions) => string,
  options: GotoAppOptions = {}
): Promise<Response | null> => {
  const { params, hash, readyWhen, readyTimeout, ...gotoOptions } = options;
  const url = buildAppUrl({ params, hash });

  if (!readyWhen) {
    return page.goto(url, gotoOptions);
  }

  const response = await page.goto(url, { waitUntil: 'commit', ...gotoOptions });
  await readyWhen.waitFor({
    state: 'visible',
    timeout: readyTimeout ?? resolveAppReadyTimeout(),
  });
  return response;
};

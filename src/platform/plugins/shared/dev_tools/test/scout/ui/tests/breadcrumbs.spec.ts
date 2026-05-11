/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test, tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

const DEV_TOOLS_READ_ROLE = {
  elasticsearch: {
    cluster: [],
  },
  kibana: [
    {
      base: [],
      feature: {
        dev_tools: ['read'],
      },
      spaces: ['*'],
    },
  ],
};

const devToolApps = [
  { hash: 'console', label: 'Console' },
  { hash: 'grokdebugger', label: 'Grok Debugger' },
  { hash: 'searchprofiler', label: 'Search Profiler' },
  { hash: 'painless_lab', label: 'Painless Lab' },
] as const;

test.describe('Dev Tools breadcrumbs', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginWithCustomRole(DEV_TOOLS_READ_ROLE);
  });

  for (const { hash, label } of devToolApps) {
    test(`sets the last breadcrumb for ${label}`, async ({ page }) => {
      await page.gotoApp('dev_tools', { hash });

      await expect(page.testSubj.locator('breadcrumb last')).toHaveText(label);
    });
  }
});

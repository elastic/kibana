/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout';
import { DEFAULT_INPUT_VALUE } from '../../../../common/constants';
import { test } from '../fixtures';

test.describe(
  'console app',
  // todo review tags
  { tag: ['@ess', '@svlSecurity', '@svlOblt', '@svlSearch'] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.console.goto();
    });

    test('should show the default request', async ({ pageObjects, log }) => {
      // is there a try method? is it needed?
      // await retry.try(async () => {
      const actualRequest = await pageObjects.console.getEditorText();
      log.debug(actualRequest);
      expect(DEFAULT_INPUT_VALUE.replace(/\s/g, '')).toContain(actualRequest?.replace(/\s/g, ''));
      // });
    });

    test('output panel should initially be in empty state', async ({ pageObjects }) => {
      expect(await pageObjects.console.isOutputPanelEmptyStateVisible()).toBe(true);
    });
  }
);

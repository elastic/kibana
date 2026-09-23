/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setTimeout as delay } from 'timers/promises';
import { expect } from '@kbn/scout/ui';
import { spaceTest, tags } from '../fixtures';

// Monaco's default hover hiding delay is 300ms; wait past it to prove the widget
// doesn't disappear on its own before we interact with it.
const HOVER_HIDING_DELAY_MS = 300;

spaceTest.describe('Discover ES|QL quick fixes', { tag: tags.deploymentAgnostic }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.discover.goto({ queryMode: 'esql' });
    await pageObjects.discover.waitUntilTabIsLoaded();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest(
    'user is able to interact with the hover content of an erroneous query',
    async ({ page, pageObjects }) => {
      const { discover } = pageObjects;

      await discover.writeAndSubmitEsqlQuery('FROM logstash-* | EVAL badField = @timestamp + 2');

      await discover.codeEditor.hoverTextInEditor(discover.esqlEditorTestSubjValue, '@timestamp');

      const hoverWidget = discover.codeEditor.getHoverPopover();
      await expect(hoverWidget).toBeVisible();

      await hoverWidget.hover();
      await expect(hoverWidget).toBeVisible();

      await delay(HOVER_HIDING_DELAY_MS * 2);
      await expect(hoverWidget).toBeVisible();

      await page.mouse.wheel(0, 100);
      await expect(hoverWidget).toBeVisible();
    }
  );
});

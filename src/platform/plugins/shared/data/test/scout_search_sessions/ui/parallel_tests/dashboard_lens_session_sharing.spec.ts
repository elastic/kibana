/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * A dashboard shares its search session with by-value Lens panels so that navigating to the
 * Lens editor and back hits the search cache. By-reference panels do not share the session.
 * See https://github.com/elastic/kibana/issues/99310.
 *
 * This asserts on the search session id rather than on an actual cache hit, so it does not
 * prove the cache-hit improvement works — but if it fails, we know for sure that it doesn't.
 *
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest, LENS_BASIC_KBN_ARCHIVE, LOGSTASH_TIME_RANGE } from '../fixtures';

const LENS_TITLE = 'Artistpreviouslyknownaslens';

spaceTest.describe(
  'Dashboard search session sharing with Lens',
  { tag: '@local-stateful-classic' },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.cleanStandardList();
      await scoutSpace.savedObjects.load(LENS_BASIC_KBN_ARCHIVE);
      // setting the default time range up front keeps the spec focused on session sharing.
      await scoutSpace.uiSettings.setDefaultTime(LOGSTASH_TIME_RANGE);
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.uiSettings.unset('timepicker:timeDefaults');
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'shares the search session with a by-value Lens panel but not with a by-reference one',
      async ({ pageObjects }) => {
        await spaceTest.step('add a by-reference Lens panel to a new dashboard', async () => {
          await pageObjects.dashboard.openNewDashboard();
          await pageObjects.dashboard.addPanelFromLibrary(LENS_TITLE);
          await pageObjects.dashboard.waitForRenderComplete();
        });

        await spaceTest.step(
          'navigating to the Lens editor and back starts a new session for a by-reference panel',
          async () => {
            await pageObjects.dashboard.openInspector(LENS_TITLE);
            const byRefSessionId = await pageObjects.inspector.getSearchSessionId();

            await pageObjects.dashboard.navigateToLensEditorFromPanel(LENS_TITLE);
            await pageObjects.lens.saveAndReturn();
            await pageObjects.dashboard.waitForRenderComplete();

            await pageObjects.dashboard.openInspector(LENS_TITLE);
            const newByRefSessionId = await pageObjects.inspector.getSearchSessionId();
            expect(newByRefSessionId).not.toBe(byRefSessionId);
          }
        );

        await spaceTest.step(
          'navigating to the Lens editor and back keeps the session for a by-value panel',
          async () => {
            await pageObjects.dashboard.unlinkFromLibrary(LENS_TITLE);
            await pageObjects.dashboard.waitForRenderComplete();

            await pageObjects.dashboard.openInspector(LENS_TITLE);
            const byValueSessionId = await pageObjects.inspector.getSearchSessionId();

            await pageObjects.dashboard.navigateToLensEditorFromPanel(LENS_TITLE);
            await pageObjects.lens.saveAndReturn();
            await pageObjects.dashboard.waitForRenderComplete();

            await pageObjects.dashboard.openInspector(LENS_TITLE);
            const newByValueSessionId = await pageObjects.inspector.getSearchSessionId();
            expect(newByValueSessionId).toBe(byValueSessionId);
          }
        );
      }
    );
  }
);

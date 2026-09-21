/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';
import { expect } from '@kbn/scout/ui';
import { COMMON_HEADERS, SESSION_API_PATH } from '../../api/fixtures';
import { getSessionCookieHeader, spaceTest } from '../fixtures';

const A11Y_SELECTORS = ['.kbnAppWrapper', '[data-euiportal="true"]'];

spaceTest.describe(
  'Background search management — accessibility',
  { tag: '@local-stateful-classic' },
  () => {
    let sessionId: string | undefined;

    spaceTest.beforeEach(async ({ apiClient, browserAuth, page, scoutSpace }) => {
      await browserAuth.loginAsPrivilegedUser();

      sessionId = uuidv4();
      const response = await apiClient.post(`s/${scoutSpace.id}${SESSION_API_PATH}`, {
        headers: { ...COMMON_HEADERS, ...(await getSessionCookieHeader(page)) },
        body: {
          sessionId,
          name: 'Background search accessibility fixture',
          appId: 'discover',
          locatorId: 'discover',
        },
      });
      expect(response.statusCode).toBe(200);
    });

    spaceTest.afterEach(async ({ apiServices, page, scoutSpace }) => {
      if (!sessionId) {
        return;
      }

      await apiServices.backgroundSearch.delete(sessionId, {
        cookieHeader: await getSessionCookieHeader(page),
        spaceId: scoutSpace.id,
      });
      sessionId = undefined;
    });

    spaceTest(
      'Background search management states have no accessibility violations',
      async ({ page, pageObjects }) => {
        const { backgroundSearchManagement } = pageObjects;

        await backgroundSearchManagement.goTo();
        await backgroundSearchManagement.expectRowCount(1);

        await spaceTest.step('management page', async () => {
          const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
          expect(violations).toStrictEqual([]);
        });

        await spaceTest.step('actions menu', async () => {
          await backgroundSearchManagement.openActionsMenu();
          const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
          expect(violations).toStrictEqual([]);
        });

        await spaceTest.step('inspect flyout', async () => {
          await backgroundSearchManagement.openInspect();
          const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
          expect(violations).toStrictEqual([]);
          await backgroundSearchManagement.closeInspect();
        });

        await spaceTest.step('rename modal', async () => {
          await backgroundSearchManagement.openActionsMenu();
          await backgroundSearchManagement.openRename();
          const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
          expect(violations).toStrictEqual([]);
          await backgroundSearchManagement.cancelRename();
        });

        await spaceTest.step('delete confirmation', async () => {
          await backgroundSearchManagement.openActionsMenu();
          await backgroundSearchManagement.openDelete();
          const { violations } = await page.checkA11y({ include: A11Y_SELECTORS });
          expect(violations).toStrictEqual([]);
          await backgroundSearchManagement.cancelDelete();
        });
      }
    );
  }
);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Expanded-document pinning in the Discover doc-viewer flyout: the open doc
 * stays visible when results are re-sorted or when a new query excludes it.
 *
 * Migrated from
 * `src/platform/test/functional/apps/discover/group9/_doc_viewer_pinning.ts`.
 */

import { expect } from '@kbn/scout/ui';
import { spaceTest } from '../fixtures';

/** Narrow 1-hour window that contains exactly 5 jpg docs. */
const PINNED_DOC_TIME_RANGE = {
  from: 'Sep 22, 2015 @ 22:00:00.000',
  to: 'Sep 22, 2015 @ 22:59:59.999',
};

const buildPinnedDocEsqlQuery = ({
  metadataFields = [] as string[],
  extensionFilter = '== "jpg"',
  sortDirection = 'DESC' as 'ASC' | 'DESC',
}) => {
  const keepFields = ['@timestamp', 'clientip', 'extension', ...metadataFields];
  const metadataClause = metadataFields.length ? ` METADATA ${metadataFields.join(', ')}` : '';
  return [
    `FROM logstash-*${metadataClause}`,
    `| WHERE extension ${extensionFilter}`,
    `| SORT @timestamp ${sortDirection}`,
    `| KEEP ${keepFields.join(', ')}`,
  ].join(' ');
};

spaceTest.describe('Discover doc viewer - pinning', { tag: '@local-stateful-classic' }, () => {
  spaceTest.beforeAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.setupDiscoverDefaults();
  });

  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsViewer();
    await pageObjects.discover.goto({ queryMode: 'classic' });
    await pageObjects.dataGrid.waitForLoad();
    await pageObjects.dataGrid.waitForDocTableRendered();
  });

  spaceTest.afterAll(async ({ discoverScoutSpace }) => {
    await discoverScoutSpace.teardownDiscoverDefaults();
  });

  spaceTest(
    'keeps the expanded classic document pinned when results reorder or exclude it',
    async ({ pageObjects }) => {
      const { datePicker, discover, dataGrid, docViewer } = pageObjects;

      await datePicker.setAbsoluteRange(PINNED_DOC_TIME_RANGE);
      await discover.waitUntilTabIsLoaded();
      await dataGrid.waitForDocTableRendered();

      await discover.writeAndSubmitKqlQuery('extension : "jpg"');
      await dataGrid.waitForDocTableRendered();

      await docViewer.openAndWaitForFlyout({ rowIndex: 0 });

      // Capture the identity of the first result.
      const timestamp = await docViewer.getFieldValue('@timestamp').innerText();
      const clientIp = await docViewer.getFieldValue('clientip').innerText();

      // Starts on page 0 (first matching doc, DESC order).
      await expect(docViewer.getNavigationPage(0)).toBeVisible();
      await expect(docViewer.getFlyoutNavigation()).toBeVisible();

      // Re-sort ascending: pinned doc moves to page 4 (last of 5 results).
      await dataGrid.sortColumn('@timestamp', 'Sort Old-New');
      await discover.waitUntilTabIsLoaded();

      await expect(docViewer.getFieldValue('@timestamp')).toHaveText(timestamp);
      await expect(docViewer.getFieldValue('clientip')).toHaveText(clientIp);
      await expect(docViewer.getNavigationPage(4)).toBeVisible();
      await expect(docViewer.getFlyoutNavigation()).toBeVisible();

      // Filter to a set that excludes the pinned doc: navigation disappears.
      await discover.writeAndSubmitKqlQuery('extension : ("css" or "gif" or "png")');
      await discover.waitUntilTabIsLoaded();

      await expect(docViewer.getFieldValue('@timestamp')).toHaveText(timestamp);
      await expect(docViewer.getFieldValue('clientip')).toHaveText(clientIp);
      await expect(docViewer.getFlyoutNavigation()).toBeHidden();
    }
  );

  spaceTest(
    'keeps the expanded ES|QL result with METADATA _id, _index pinned when results reorder or exclude it',
    async ({ pageObjects }) => {
      const { datePicker, discover, dataGrid, docViewer } = pageObjects;

      await datePicker.setAbsoluteRange(PINNED_DOC_TIME_RANGE);
      await discover.waitUntilTabIsLoaded();
      await dataGrid.waitForDocTableRendered();

      await discover.writeAndSubmitEsqlQuery(
        buildPinnedDocEsqlQuery({ metadataFields: ['_id', '_index'] })
      );
      await discover.waitUntilTabIsLoaded();
      await dataGrid.waitForDocTableRendered();

      await docViewer.openAndWaitForFlyout({ rowIndex: 0 });

      const timestamp = await docViewer.getFieldValue('@timestamp').innerText();
      const clientIp = await docViewer.getFieldValue('clientip').innerText();

      await expect(docViewer.getNavigationPage(0)).toBeVisible();
      await expect(docViewer.getFlyoutNavigation()).toBeVisible();

      // Re-submit with ASC sort: pinned doc moves to page 4.
      await discover.writeAndSubmitEsqlQuery(
        buildPinnedDocEsqlQuery({ metadataFields: ['_id', '_index'], sortDirection: 'ASC' })
      );
      await discover.waitUntilTabIsLoaded();

      await expect(docViewer.getFieldValue('@timestamp')).toHaveText(timestamp);
      await expect(docViewer.getFieldValue('clientip')).toHaveText(clientIp);
      await expect(docViewer.getNavigationPage(4)).toBeVisible();
      await expect(docViewer.getFlyoutNavigation()).toBeVisible();

      // Filter to a set that excludes the pinned doc: navigation disappears.
      await discover.writeAndSubmitEsqlQuery(
        buildPinnedDocEsqlQuery({
          metadataFields: ['_id', '_index'],
          extensionFilter: '!= "jpg"',
        })
      );
      await discover.waitUntilTabIsLoaded();

      await expect(docViewer.getFieldValue('@timestamp')).toHaveText(timestamp);
      await expect(docViewer.getFieldValue('clientip')).toHaveText(clientIp);
      await expect(docViewer.getFlyoutNavigation()).toBeHidden();
    }
  );
});

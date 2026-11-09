/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  spaceTest,
  setupContextAwareness,
  teardownContextAwareness,
  CONTEXT_AWARENESS_DATA_VIEWS,
  LOGSTASH_TIME_RANGE,
} from '../fixtures';

/**
 * A log data source resolves a `singlePage` pagination mode, which drops the pager and the
 * rows-per-page control from the grid footer; anything else keeps the default paginated footer.
 * Only that rendering consequence is asserted — which sources resolve to `singlePage` is covered by
 * profile_providers/observability/logs_data_source_profile/accessors/get_pagination_config.test.ts.
 *
 * These cases query `logstash*`, whose documents sit outside the suite-wide default time range, so
 * the space default is widened to cover them for this spec only.
 */
spaceTest.describe(
  'Discover context awareness - extension getPaginationConfig',
  { tag: tags.deploymentAgnostic },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await setupContextAwareness(scoutSpace);
      await scoutSpace.uiSettings.setDefaultTime(LOGSTASH_TIME_RANGE);
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await teardownContextAwareness(scoutSpace);
    });

    spaceTest(
      'ES|QL mode renders without pagination using a single page',
      async ({ pageObjects }) => {
        const { dataGrid, discover } = pageObjects;

        await discover.goto({ queryMode: 'esql' });
        await discover.writeAndSubmitEsqlQuery('from logstash* | sort @timestamp desc');

        await expect(dataGrid.getRowsPerPageButton()).toBeHidden();
        await expect(dataGrid.getPreviousPageButton()).toBeHidden();
        await expect(dataGrid.getNextPageButton()).toBeHidden();
      }
    );

    spaceTest(
      'data view mode renders single page pagination without page numbers',
      async ({ pageObjects }) => {
        const { dataGrid, discover } = pageObjects;

        await discover.goto({ queryMode: 'classic' });
        await discover.selectDataView(CONTEXT_AWARENESS_DATA_VIEWS.LOGS_AND_LOGSTASH, {
          createAdHocIfMissing: false,
        });
        await discover.waitUntilSearchingHasFinished();

        await expect(dataGrid.getRowsPerPageButton()).toBeHidden();
        await expect(dataGrid.getPreviousPageButton()).toBeHidden();
        await expect(dataGrid.getNextPageButton()).toBeHidden();
      }
    );

    spaceTest(
      'data view mode renders default pagination with page numbers',
      async ({ pageObjects }) => {
        const { dataGrid, discover } = pageObjects;

        await discover.goto({ queryMode: 'classic' });
        // The title must not read as a log source — `log`/`logs` would itself resolve `singlePage`
        // and the default pagination under test would never render.
        await discover.createDataViewFromSearchBar({ name: 'lo', adHoc: true });
        await discover.waitUntilSearchingHasFinished();

        await expect(dataGrid.getRowsPerPageButton()).toBeVisible();
        await expect(dataGrid.getPreviousPageButton()).toBeVisible();
        await expect(dataGrid.getNextPageButton()).toBeVisible();
        expect(await dataGrid.getCurrentRowsPerPage()).toBe(100);
      }
    );
  }
);

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
  BREAKDOWN_FIELD,
  BREAKDOWN_SELECTOR,
  CONTEXT_AWARENESS_DATA_VIEWS,
  EXAMPLE_CHART,
  LOGS_PROFILE_BREAKDOWN_LEGEND,
  getHistogramLegend,
} from '../fixtures';

/**
 * `example-data-source-profile` colours the `log.level` breakdown values through
 * `getBreakdownColorMappings`. Every `my-example-logs` document has a distinct level, so the legend
 * lists all of them. The legend order is not asserted: it is the default alphabetical ES|QL order.
 */
spaceTest.describe(
  'Discover context awareness - extension getBreakdownColorMappings, ES|QL mode',
  { tag: tags.deploymentAgnostic },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await setupContextAwareness(scoutSpace);
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsAdmin();
      await pageObjects.discover.goto({ queryMode: 'esql' });
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await teardownContextAwareness(scoutSpace);
    });

    spaceTest(
      'colours the breakdown legend as the profile defines',
      async ({ page, pageObjects }) => {
        const { discover } = pageObjects;

        await discover.writeAndSubmitEsqlQuery(`from ${CONTEXT_AWARENESS_DATA_VIEWS.LOGS}`);

        await expect(page.testSubj.locator(BREAKDOWN_SELECTOR)).toHaveAttribute(
          'data-selected-value',
          BREAKDOWN_FIELD
        );

        await expect
          .poll(async () => {
            const legend = await getHistogramLegend(page.testSubj.locator(EXAMPLE_CHART));
            return legend.sort(([labelA], [labelB]) => labelA.localeCompare(labelB));
          })
          .toStrictEqual(LOGS_PROFILE_BREAKDOWN_LEGEND);
      }
    );
  }
);

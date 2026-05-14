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
  TRACES,
  setupTracesExperience,
  teardownTracesExperience,
} from '../../fixtures/traces_experience';

spaceTest.describe(
  'Traces in Discover - Custom columns',
  {
    tag: [...tags.stateful.all, ...tags.serverless.observability.complete],
  },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace, config }) => {
      await setupTracesExperience(scoutSpace, config);
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await teardownTracesExperience(scoutSpace);
    });

    spaceTest(
      'should display trace-specific columns in data view mode',
      async ({ pageObjects }) => {
        await pageObjects.discover.goto({ queryMode: 'classic' });

        await spaceTest.step('verify trace-specific column headers', async () => {
          await pageObjects.discover.waitForDocTableRendered();
          for (const column of pageObjects.tracesExperience.grid.expectedColumns) {
            await expect(pageObjects.discover.getColumnHeader(column)).toBeVisible();
          }
        });
      }
    );

    spaceTest('should display trace-specific columns in ESQL mode', async ({ pageObjects }) => {
      await pageObjects.discover.goto({ queryMode: 'esql' });

      await spaceTest.step('switch to ESQL mode with a different index pattern', async () => {
        await pageObjects.discover.writeAndSubmitEsqlQuery(TRACES.ESQL_QUERY);
      });

      await spaceTest.step('verify trace-specific column headers', async () => {
        await pageObjects.discover.waitForDocTableRendered();
        for (const column of pageObjects.tracesExperience.grid.expectedColumns) {
          await expect(pageObjects.discover.getColumnHeader(column)).toBeVisible();
        }
      });
    });
  }
);

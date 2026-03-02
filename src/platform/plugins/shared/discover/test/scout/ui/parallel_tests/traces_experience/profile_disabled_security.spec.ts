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
  'Traces in Discover - Profile disabled (Security solution)',
  {
    tag: tags.stateful.all,
  },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace, config }) => {
      await setupTracesExperience(scoutSpace, config, { solutionView: 'security' });
    });

    spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
      await browserAuth.loginAsViewer();
      await pageObjects.discover.goto();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await teardownTracesExperience(scoutSpace);
    });

    spaceTest(
      'should not display trace-specific columns in data view mode',
      async ({ pageObjects }) => {
        await spaceTest.step('wait for results to load', async () => {
          await pageObjects.discover.waitForDocTableRendered();
        });

        await spaceTest.step('verify trace-specific columns are not present', async () => {
          const { tracesExperience } = pageObjects;

          for (const column of tracesExperience.profileSpecificColumns) {
            await expect(tracesExperience.getColumnHeader(column)).toBeHidden();
          }
        });
      }
    );

    spaceTest('should not render RED metrics charts in ESQL mode', async ({ pageObjects }) => {
      await spaceTest.step('run ESQL query for traces', async () => {
        await pageObjects.discover.writeEsqlQuery(TRACES.ESQL_QUERY);
      });

      await spaceTest.step('verify RED metrics grid is not visible', async () => {
        await expect(pageObjects.tracesExperience.redMetricsGrid).toBeHidden();
      });
    });

    spaceTest('should not show Overview tab in document flyout', async ({ pageObjects }) => {
      await spaceTest.step('open first document in flyout', async () => {
        await pageObjects.tracesExperience.openDocumentFlyout(pageObjects.discover);
      });

      await spaceTest.step('verify Overview tab is not present', async () => {
        await expect(pageObjects.tracesExperience.overviewTab).toBeHidden();
      });
    });
  }
);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SEARCH_EMBEDDABLE_TYPE } from '@kbn/discover-utils';
import type { ScoutParallelWorkerFixtures } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import {
  spaceTest,
  LOGS,
  LOGS_EXPERIENCE_TAGS,
  PUSH_FLYOUT_VIEWPORT,
  setupLogsExperience,
  teardownLogsExperience,
} from '../fixtures';

/**
 * A dashboard holding a single saved-search panel on the seeded doc-viewer logs. Built over the API
 * rather than through the UI, and kept to one panel so the row locators stay unambiguous.
 */
const createDashboardWithLogsPanel = async (
  apiServices: ScoutParallelWorkerFixtures['apiServices'],
  spaceId: string
): Promise<string> =>
  apiServices.dashboard.create(
    {
      title: `logs-doc-viewer-embeddable-${spaceId}`,
      time_range: {
        from: LOGS.DEFAULT_START_TIME,
        to: LOGS.DEFAULT_END_TIME,
        mode: 'absolute',
      },
      panels: [
        {
          type: SEARCH_EMBEDDABLE_TYPE,
          grid: { x: 0, y: 0, w: 24, h: 15 },
          config: {
            tabs: [
              {
                data_source: {
                  type: 'data_view_spec',
                  index_pattern: LOGS.SYNTH_DOCVIEWER_DATA_VIEW,
                  time_field: '@timestamp',
                },
              },
            ],
          },
        },
      ],
    },
    spaceId
  );

spaceTest.describe(
  'Logs profile - Doc viewer',
  {
    tag: LOGS_EXPERIENCE_TAGS,
  },
  () => {
    spaceTest.use({ viewport: PUSH_FLYOUT_VIEWPORT });

    spaceTest.beforeAll(async ({ scoutSpace, config }) => {
      await setupLogsExperience(scoutSpace, config);
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await teardownLogsExperience(scoutSpace);
    });

    spaceTest('should open each section from its own leading control', async ({ pageObjects }) => {
      const { docViewer, logsExperience } = pageObjects;

      await logsExperience.gotoDocViewerLogs();

      await spaceTest.step('a plain expand leaves both sections collapsed', async () => {
        await docViewer.openAndWaitForFlyout({ rowIndex: 0 });

        // The Log overview tab sorts first for a log document and only the selected tab's content
        // renders, so a visible accordion is what proves the flyout landed on that tab.
        await expect(logsExperience.stacktraceAccordion).toHaveAttribute('aria-expanded', 'false');
        await expect(logsExperience.qualityIssuesAccordion).toHaveAttribute(
          'aria-expanded',
          'false'
        );
        await docViewer.close();
      });

      await spaceTest.step('the stacktrace control opens only the stacktrace', async () => {
        await logsExperience.clickStacktraceControl(0);

        await expect(logsExperience.stacktraceAccordion).toHaveAttribute('aria-expanded', 'true');
        await expect(logsExperience.qualityIssuesAccordion).toHaveAttribute(
          'aria-expanded',
          'false'
        );
        await docViewer.close();
      });

      await spaceTest.step('the quality issue control opens only quality issues', async () => {
        await logsExperience.clickQualityIssueControl(0);

        await expect(logsExperience.qualityIssuesAccordion).toHaveAttribute(
          'aria-expanded',
          'true'
        );
        await expect(logsExperience.stacktraceAccordion).toHaveAttribute('aria-expanded', 'false');
      });
    });

    // The doc viewer keys its tab content on the record id, so a second control on the same row
    // reuses the mounted tab. Only a browser can prove that: the key lives in @kbn/unified-doc-viewer,
    // and a unit test of the profile would have to assume the very remount behaviour under test.
    spaceTest(
      'should keep both sections open when both controls of the same row are used',
      async ({ pageObjects }) => {
        const { logsExperience } = pageObjects;

        await logsExperience.gotoDocViewerLogs();

        await logsExperience.clickStacktraceControl(0);
        await expect(logsExperience.stacktraceAccordion).toHaveAttribute('aria-expanded', 'true');

        await logsExperience.clickQualityIssueControl(0);
        await expect(logsExperience.qualityIssuesAccordion).toHaveAttribute(
          'aria-expanded',
          'true'
        );

        // Still open, which only holds if the tab was reused rather than remounted.
        await expect(logsExperience.stacktraceAccordion).toHaveAttribute('aria-expanded', 'true');
      }
    );

    // The negative control for the test above, and the reason it cannot be a unit test either: a
    // different record id must remount the tab, so the previously opened section closes.
    spaceTest(
      'should open only the new section when the controls are on different rows',
      async ({ pageObjects }) => {
        const { dataGrid, logsExperience } = pageObjects;

        await logsExperience.gotoDocViewerLogs();

        // A data regression fails here rather than as a missing-locator timeout below.
        expect(await dataGrid.getDocTableRowCount()).toBeGreaterThan(1);

        await logsExperience.clickStacktraceControl(0);
        await expect(logsExperience.stacktraceAccordion).toHaveAttribute('aria-expanded', 'true');

        await logsExperience.clickQualityIssueControl(1);

        await expect(logsExperience.qualityIssuesAccordion).toHaveAttribute(
          'aria-expanded',
          'true'
        );
        await expect(logsExperience.stacktraceAccordion).toHaveAttribute('aria-expanded', 'false');
      }
    );

    // A leading control asks for the Log overview tab via `setExpandedDoc`'s `initialTabId`. Getting
    // that to an already-open flyout runs through the host's own `setSelectedTabId` wiring, so it
    // has to be exercised in a browser.
    spaceTest(
      'should return to the Log overview tab from another tab when a control is clicked',
      async ({ pageObjects }) => {
        const { dataGrid, docViewer, logsExperience } = pageObjects;

        await logsExperience.gotoDocViewerLogs();

        await spaceTest.step('open the flyout and switch to the JSON tab', async () => {
          await docViewer.openAndWaitForFlyout({ rowIndex: 0 });
          await docViewer.openTab(LOGS.JSON_TAB);

          // Only the selected tab renders its content, so the accordions are gone entirely.
          await expect(logsExperience.qualityIssuesSection).toBeHidden();
        });

        await spaceTest.step('the same row switches back and opens quality issues', async () => {
          await logsExperience.clickQualityIssueControl(0);

          await expect(logsExperience.qualityIssuesAccordion).toHaveAttribute(
            'aria-expanded',
            'true'
          );
          await expect(logsExperience.stacktraceAccordion).toHaveAttribute(
            'aria-expanded',
            'false'
          );
        });

        await spaceTest.step('a different row switches back too', async () => {
          expect(await dataGrid.getDocTableRowCount()).toBeGreaterThan(1);

          await docViewer.openTab(LOGS.JSON_TAB);
          await expect(logsExperience.qualityIssuesSection).toBeHidden();

          await logsExperience.clickQualityIssueControl(1);

          await expect(logsExperience.qualityIssuesAccordion).toHaveAttribute(
            'aria-expanded',
            'true'
          );
        });
      }
    );

    spaceTest(
      'should open a section from a leading control inside a dashboard panel',
      async ({ apiServices, scoutSpace, pageObjects }) => {
        const { dashboard, dataGrid, logsExperience } = pageObjects;

        const dashboardId = await createDashboardWithLogsPanel(apiServices, scoutSpace.id);
        await dashboard.openDashboardWithId(dashboardId);
        await dataGrid.waitForDocTableRendered();

        // Both controls come from the logs data source profile, so their presence is what proves the
        // profile resolved through the panel rather than through the Discover app shell.
        await expect(logsExperience.qualityIssueControl(0)).toBeVisible();
        await expect(logsExperience.stacktraceControl(0)).toBeVisible();

        await logsExperience.clickStacktraceControl(0);

        await expect(logsExperience.stacktraceAccordion).toHaveAttribute('aria-expanded', 'true');
        await expect(logsExperience.qualityIssuesAccordion).toHaveAttribute(
          'aria-expanded',
          'false'
        );
      }
    );

    // The embeddable drives the doc viewer's selected tab through its own `initialDocViewerTabId$`
    // wiring, which shares no code with the Discover flyout's. Covered here for that reason.
    spaceTest(
      'should return to the Log overview tab from another tab inside a dashboard panel',
      async ({ apiServices, scoutSpace, pageObjects }) => {
        const { dashboard, dataGrid, docViewer, logsExperience } = pageObjects;

        const dashboardId = await createDashboardWithLogsPanel(apiServices, scoutSpace.id);
        await dashboard.openDashboardWithId(dashboardId);
        await dataGrid.waitForDocTableRendered();

        await docViewer.openAndWaitForFlyout({ rowIndex: 0 });
        await docViewer.openTab(LOGS.JSON_TAB);
        await expect(logsExperience.qualityIssuesSection).toBeHidden();

        await logsExperience.clickQualityIssueControl(0);

        await expect(logsExperience.qualityIssuesAccordion).toHaveAttribute(
          'aria-expanded',
          'true'
        );
      }
    );
  }
);

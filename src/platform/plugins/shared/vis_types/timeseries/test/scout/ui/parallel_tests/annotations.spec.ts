/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { expect } from '@kbn/scout/ui';
import {
  CHART_POLL_OPTIONS,
  cleanupTsvbSpace,
  enableElasticChartDebug,
  getAnnotationsData,
  openTimeSeriesEditor,
  setupTsvbSpace,
  spaceTest,
  testData,
} from '../fixtures';
import type { AnnotationData } from '../fixtures';
import type { VisualBuilder } from '../fixtures/page_objects';

const expectAnnotationsData = async (
  visualBuilder: VisualBuilder,
  expectedAnnotations: AnnotationData[]
): Promise<void> => {
  await expect
    .poll(
      async () => getAnnotationsData(await visualBuilder.getChartDebugState()),
      CHART_POLL_OPTIONS
    )
    .toStrictEqual(expectedAnnotations);
};

spaceTest.describe('TSVB Time Series - annotations', { tag: testData.DEPLOYMENT_TAGS }, () => {
  spaceTest.beforeAll(async ({ scoutSpace }) => {
    await setupTsvbSpace(scoutSpace);
  });

  spaceTest.beforeEach(async ({ browserAuth, context, pageObjects }) => {
    // Has to run before the app is loaded: the chart reads the flag while mounting.
    await enableElasticChartDebug(context);
    await browserAuth.loginAsPrivilegedUser();

    const { visualBuilder } = pageObjects;
    await openTimeSeriesEditor(pageObjects);
    await visualBuilder.clickPanelOptions('timeSeries');
    await visualBuilder.setIntervalValue('12h');
    await visualBuilder.clickAnnotationsTab();
    await visualBuilder.clickAnnotationsAddDataSourceButton();
  });

  spaceTest.afterAll(async ({ scoutSpace }) => {
    await cleanupTsvbSpace(scoutSpace);
  });

  spaceTest(
    'displays the correct annotations for the extension.raw field',
    async ({ pageObjects }) => {
      const { visualBuilder } = pageObjects;

      await visualBuilder.setAnnotationFilter('geo.dest : "AW" or geo.src : "AM"');
      await visualBuilder.setAnnotationFields('extension.raw');
      await visualBuilder.setAnnotationRowTemplate('extension: {{extension.raw}}');

      await expectAnnotationsData(visualBuilder, [
        { dataValue: 1442743200000, details: 'extension: css', header: '2015-09-20 10:00' },
        { dataValue: 1442754000000, details: 'extension: jpg', header: '2015-09-20 13:00' },
        { dataValue: 1442818800000, details: 'extension: jpg', header: '2015-09-21 07:00' },
      ]);
    }
  );

  spaceTest(
    'displays the correct annotations for the machine.os.raw and memory fields',
    async ({ pageObjects }) => {
      const { visualBuilder } = pageObjects;

      await visualBuilder.setAnnotationFilter('bytes = 0');
      await visualBuilder.setAnnotationFields('machine.os.raw, memory');
      await visualBuilder.setAnnotationRowTemplate('OS: {{machine.os.raw}}, memory: {{memory}}');

      await expectAnnotationsData(visualBuilder, [
        { dataValue: 1442721600000, details: 'OS: win 7, memory: 0', header: '2015-09-20 04:00' },
        { dataValue: 1442743200000, details: 'OS: win xp, memory: 0', header: '2015-09-20 10:00' },
        {
          dataValue: 1442772000000,
          details: 'OS: ios, memory: 246280',
          header: '2015-09-20 18:00',
        },
        { dataValue: 1442815200000, details: 'OS: ios, memory: 0', header: '2015-09-21 06:00' },
        { dataValue: 1442826000000, details: 'OS: win 8, memory: 0', header: '2015-09-21 09:00' },
        { dataValue: 1442851200000, details: 'OS: win 7, memory: 0', header: '2015-09-21 16:00' },
      ]);
    }
  );

  spaceTest('displays the correct annotations for a runtime field', async ({ pageObjects }) => {
    const { visualBuilder } = pageObjects;

    await visualBuilder.setAnnotationFilter('memory > 300000 and geo.src: "US"');
    await visualBuilder.setAnnotationFields('hello_world_runtime_field, geo.dest');
    await visualBuilder.setAnnotationRowTemplate(
      '{{hello_world_runtime_field}} from {{geo.dest}}!'
    );

    await expectAnnotationsData(visualBuilder, [
      { dataValue: 1442736000000, details: 'hello world from US!', header: '2015-09-20 08:00' },
      { dataValue: 1442746800000, details: 'hello world from CN!', header: '2015-09-20 11:00' },
      { dataValue: 1442761200000, details: 'hello world from MX!', header: '2015-09-20 15:00' },
      { dataValue: 1442822400000, details: 'hello world from IN!', header: '2015-09-21 08:00' },
      { dataValue: 1442826000000, details: 'hello world from TH!', header: '2015-09-21 09:00' },
      { dataValue: 1442829600000, details: 'hello world from SY!', header: '2015-09-21 10:00' },
    ]);
  });
});

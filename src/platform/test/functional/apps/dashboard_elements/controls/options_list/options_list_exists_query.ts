/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { OPTIONS_LIST_CONTROL } from '@kbn/controls-constants';
import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const pieChart = getService('pieChart');
  const esArchiver = getService('esArchiver');
  const elasticChart = getService('elasticChart');

  const { dashboardControls, dashboard } = getPageObjects(['dashboardControls', 'dashboard']);

  describe('Test exists query', () => {
    let controlId: string;

    before(async () => {
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/dashboard_elements/controls/test_exists'
      );
      await dashboard.loadDashboardInEditMode('Test Options List Control');
      await elasticChart.setNewChartUiDebugFlag();

      await dashboardControls.createControl({
        controlType: OPTIONS_LIST_CONTROL,
        dataViewTitle: 'animals-*',
        fieldName: 'animal.keyword',
        title: 'Animal',
      });
      controlId = (await dashboardControls.getAllControlIds())[1];
    });

    it('creating exists query has expected results', async () => {
      await dashboard.waitForRenderComplete();
      expect((await pieChart.getPieChartValues())[0]).to.be(6);
      await dashboardControls.optionsListOpenPopover(controlId);
      await dashboardControls.optionsListPopoverSelectExists();
      await dashboardControls.optionsListEnsurePopoverIsClosed(controlId);
      await dashboard.waitForRenderComplete();

      expect(await pieChart.getPieSliceCount()).to.be(5);
      expect((await pieChart.getPieChartValues())[0]).to.be(5);
    });

    it('negating exists query has expected results', async () => {
      await dashboardControls.optionsListOpenPopover(controlId);
      await dashboardControls.optionsListPopoverSetIncludeSelections(false);
      await dashboardControls.optionsListEnsurePopoverIsClosed(controlId);
      await dashboard.waitForRenderComplete();

      expect(await pieChart.getPieSliceCount()).to.be(1);
      expect((await pieChart.getPieChartValues())[0]).to.be(1);
    });

    after(async () => {
      await esArchiver.unload(
        'src/platform/test/functional/fixtures/es_archiver/dashboard_elements/controls/test_exists'
      );
    });
  });
}

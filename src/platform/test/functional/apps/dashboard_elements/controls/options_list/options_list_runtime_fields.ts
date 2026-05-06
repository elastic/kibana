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

import { OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS } from '../../../../page_objects/dashboard_page_controls';
import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const pieChart = getService('pieChart');
  const kibanaServer = getService('kibanaServer');
  const browser = getService('browser');
  const elasticChart = getService('elasticChart');

  const { dashboardControls, dashboard } = getPageObjects(['dashboardControls', 'dashboard']);

  describe('Test data view runtime field', () => {
    let controlId: string;

    before(async () => {
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/dashboard/current/options_list_runtime_fields'
      );
      await browser.refresh();
      await dashboard.loadDashboardInEditMode('Test Options List on Runtime Field');
      await elasticChart.setNewChartUiDebugFlag();
    });

    const FIELD_VALUES = {
      G:
        OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS.growl +
        OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS.grr +
        OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS.grrr,
      H: OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS.hiss,
      B:
        OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS.bark +
        OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS['bow ow ow'],
      R: OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS.ruff,
      M: OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS.meow,
    };

    it('can create options list control on runtime field', async () => {
      await dashboardControls.createControl({
        controlType: OPTIONS_LIST_CONTROL,
        fieldName: 'testRuntimeField',
        dataViewTitle: 'animals-runtime-field',
      });
      expect(await dashboardControls.getControlsCount()).to.be(1);
    });

    it('new control has expected suggestions', async () => {
      controlId = (await dashboardControls.getAllControlIds())[0];
      await dashboardControls.ensureAvailableOptionsEqual(controlId, {
        suggestions: FIELD_VALUES,
        invalidSelections: [],
      });
    });

    it('making selection has expected results', async () => {
      await dashboardControls.optionsListOpenPopover(controlId);
      await dashboardControls.optionsListPopoverSelectOption('B');
      await dashboardControls.optionsListEnsurePopoverIsClosed(controlId);

      await dashboard.waitForRenderComplete();
      expect(await pieChart.getPieChartLabels()).to.eql(['bark', 'bow ow ow']);
    });

    after(async () => {
      await dashboard.clearUnsavedChanges();
      await kibanaServer.importExport.unload(
        'src/platform/test/functional/fixtures/kbn_archiver/dashboard/current/options_list_runtime_fields'
      );
    });
  });
}

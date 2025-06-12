/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { OPTIONS_LIST_CONTROL, RANGE_SLIDER_CONTROL } from '@kbn/controls-plugin/common';
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const filterBar = getService('filterBar');
  const testSubjects = getService('testSubjects');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const dashboardPanelActions = getService('dashboardPanelActions');

  const { dashboardControls, dashboard } = getPageObjects(['dashboardControls', 'dashboard']);

  describe('Dashboard options list creation and editing', () => {
    before(async () => {
      await dashboard.ensureDashboardIsInEditMode();
    });

    after(async () => {
      await dashboardControls.deleteAllControls();
      await dashboard.clickQuickSave();
    });

    describe('Options List Control Editor selects relevant data views', () => {
      it('selects the default data view when the dashboard is blank', async () => {
        expect(await dashboardControls.optionsListEditorGetCurrentDataView(true)).to.eql(
          'logstash-*'
        );
      });

      it('selects a relevant data view based on the panels on the dashboard', async () => {
        await dashboardAddPanel.addVisualization('Rendering-Test:-animal-sounds-pie');
        await dashboard.waitForRenderComplete();
        expect(await dashboardControls.optionsListEditorGetCurrentDataView(true)).to.eql(
          'animals-*'
        );
        await dashboard.waitForRenderComplete();
        await dashboardPanelActions.removePanelByTitle('Rendering Test: animal sounds pie');
        expect(await dashboardControls.optionsListEditorGetCurrentDataView(true)).to.eql(
          'logstash-*'
        );
      });

      it('selects the last used data view by default', async () => {
        await dashboardControls.createControl({
          controlType: OPTIONS_LIST_CONTROL,
          dataViewTitle: 'animals-*',
          fieldName: 'sound.keyword',
        });
        expect(await dashboardControls.optionsListEditorGetCurrentDataView(true)).to.eql(
          'animals-*'
        );
        await dashboardControls.deleteAllControls();
      });
    });

    describe('Options List Control creation and editing experience', function () {
      it('can add a new options list control from a blank state', async () => {
        await dashboardControls.createControl({
          controlType: OPTIONS_LIST_CONTROL,
          dataViewTitle: 'logstash-*',
          fieldName: 'machine.os.raw',
        });
        expect(await dashboardControls.getControlsCount()).to.be(1);
        await dashboard.clearUnsavedChanges();
      });

      it('can make selections', async () => {
        const firstId = (await dashboardControls.getAllControlIds())[0];
        await dashboardControls.optionsListOpenPopover(firstId);
        await dashboardControls.optionsListPopoverSelectOption('win xp');
        await dashboardControls.optionsListPopoverSelectOption('osx');
        await dashboardControls.optionsListEnsurePopoverIsClosed(firstId);

        const selectionString = await dashboardControls.optionsListGetSelectionsString(firstId);
        expect(selectionString).to.be('win xp, osx');
      });

      it('can add a second options list control with a non-default data view', async () => {
        await dashboardControls.createControl({
          controlType: OPTIONS_LIST_CONTROL,
          dataViewTitle: 'animals-*',
          fieldName: 'sound.keyword',
        });
        expect(await dashboardControls.getControlsCount()).to.be(2);

        // data views should be properly propagated from the control group to the dashboard
        expect(await filterBar.getIndexPatterns()).to.be('logstash-*,animals-*');
        await dashboard.clearUnsavedChanges();
      });

      it('can change the data view and field of an existing options list and clears selections', async () => {
        const firstId = (await dashboardControls.getAllControlIds())[0];
        await dashboardControls.editExistingControl(firstId);

        const saveButton = await testSubjects.find('control-editor-save');
        expect(await saveButton.isEnabled()).to.be(true);
        await dashboardControls.controlsEditorSetDataView('animals-*');
        expect(await saveButton.isEnabled()).to.be(false);
        await dashboardControls.controlsEditorSetfield('animal.keyword');
        await dashboardControls.controlsEditorSetControlType(OPTIONS_LIST_CONTROL);
        await dashboardControls.controlEditorSave();

        const selectionString = await dashboardControls.optionsListGetSelectionsString(firstId);
        expect(selectionString).to.be('Any');

        // when creating a new filter, the ability to select a data view should be removed, because the dashboard now only has one data view
        await retry.try(async () => {
          await testSubjects.click('addFilter');
          const indexPatternSelectExists = await testSubjects.exists('filterIndexPatternsSelect');
          await filterBar.ensureFieldEditorModalIsClosed();
          expect(indexPatternSelectExists).to.be(false);
        });
      });

      it('renames an existing control and retains selection', async () => {
        const secondId = (await dashboardControls.getAllControlIds())[1];

        await dashboardControls.optionsListOpenPopover(secondId);
        await dashboardControls.optionsListPopoverSelectOption('hiss');
        await dashboardControls.optionsListEnsurePopoverIsClosed(secondId);

        const newTitle = 'wow! Animal sounds?';
        await dashboardControls.editExistingControl(secondId);
        await dashboardControls.controlEditorSetTitle(newTitle);
        await dashboardControls.controlEditorSetWidth('small');
        await dashboardControls.controlEditorSave();
        expect(await dashboardControls.doesControlTitleExist(newTitle)).to.be(true);

        const selectionString = await dashboardControls.optionsListGetSelectionsString(secondId);
        expect(selectionString).to.be('hiss');

        await dashboard.clearUnsavedChanges();
      });

      it('can change an existing control to a number field', async () => {
        const firstId = (await dashboardControls.getAllControlIds())[0];
        await dashboardControls.editExistingControl(firstId);
        await dashboardControls.controlsEditorSetfield('weightLbs');
        await dashboardControls.controlsEditorVerifySupportedControlTypes({
          supportedTypes: [OPTIONS_LIST_CONTROL, RANGE_SLIDER_CONTROL],
          selectedType: OPTIONS_LIST_CONTROL,
        });
        await dashboardControls.controlEditorSave();
      });

      it('deletes an existing control', async () => {
        const firstId = (await dashboardControls.getAllControlIds())[0];

        await dashboardControls.removeExistingControl(firstId);
        expect(await dashboardControls.getControlsCount()).to.be(1);
        await dashboard.clearUnsavedChanges();
      });

      it('cannot create options list for scripted field', async () => {
        await dashboardControls.openCreateControlFlyout();
        expect(await dashboardControls.optionsListEditorGetCurrentDataView(false)).to.eql(
          'animals-*'
        );
        await testSubjects.missingOrFail('field-picker-select-isDog');
        await dashboardControls.controlEditorCancel();
      });
    });
  });
}

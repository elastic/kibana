/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pick } from 'lodash';

import expect from '@kbn/expect';

import { OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS } from '../../../../page_objects/dashboard_page_controls';
import type { FtrProviderContext } from '../../../../ftr_provider_context';

const OPTIONS_LIST_DASHBOARD_NAME = 'Test Options List Control';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const queryBar = getService('queryBar');
  const pieChart = getService('pieChart');
  const filterBar = getService('filterBar');

  const { dashboardControls, timePicker, dashboard, header } = getPageObjects([
    'dashboardControls',
    'timePicker',
    'dashboard',
    'header',
  ]);

  describe('Interactions between options list and dashboard', () => {
    let controlId: string;

    before(async () => {
      await dashboard.loadDashboardInEditMode(OPTIONS_LIST_DASHBOARD_NAME);
      controlId = (await dashboardControls.getAllControlIds())[0];
      await header.waitUntilLoadingHasFinished();
    });

    describe('Applies query settings to controls', () => {
      it('Malformed query throws an error', async () => {
        await queryBar.setQuery('animal.keyword : "dog" error');
        await queryBar.submitQuery(); // quicker than clicking the submit button, but hides the time picker
        await header.waitUntilLoadingHasFinished();
        await dashboardControls.checkForControlErrorStatus(controlId, true);
      });

      it('Can recover from malformed query error', async () => {
        await queryBar.setQuery('animal.keyword : "dog"');
        await queryBar.submitQuery();
        await header.waitUntilLoadingHasFinished();
        await dashboardControls.checkForControlErrorStatus(controlId, false);
      });

      it('Applies dashboard query to options list control', async () => {
        const suggestions = pick(OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS, [
          'ruff',
          'bark',
          'grrr',
          'bow ow ow',
          'grr',
        ]);
        await dashboardControls.ensureAvailableOptionsEqual(controlId, {
          suggestions: { ...suggestions, grr: suggestions.grr - 1 },
          invalidSelections: [],
        });
        await queryBar.setQuery('');
        await queryBar.clickQuerySubmitButton(); // slower than submitQuery but ensures that the time picker is visible for the next test
      });

      it('Applies dashboard time range to options list control', async () => {
        // set time range to time with no documents
        await timePicker.setAbsoluteRange(
          'Jan 1, 2017 @ 00:00:00.000',
          'Jan 1, 2017 @ 00:00:00.000'
        );
        await header.waitUntilLoadingHasFinished();

        await dashboardControls.optionsListOpenPopover(controlId);
        expect(await dashboardControls.optionsListPopoverGetAvailableOptionsCount()).to.be(0);
        await dashboardControls.optionsListEnsurePopoverIsClosed(controlId);
        await timePicker.setDefaultDataRange();
      });

      describe('dashboard filters', () => {
        before(async () => {
          await filterBar.addFilter({
            field: 'sound.keyword',
            operation: 'is one of',
            value: ['bark', 'bow ow ow', 'ruff'],
          });
          await header.waitUntilLoadingHasFinished();
        });

        it('Applies dashboard filters to options list control', async () => {
          const suggestions = pick(OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS, [
            'ruff',
            'bark',
            'bow ow ow',
          ]);
          await dashboardControls.ensureAvailableOptionsEqual(controlId, {
            suggestions,
            invalidSelections: [],
          });
        });

        it('Does not apply disabled dashboard filters to options list control', async () => {
          await filterBar.toggleFilterEnabled('sound.keyword');
          await header.waitUntilLoadingHasFinished();
          await dashboardControls.ensureAvailableOptionsEqual(controlId, {
            suggestions: OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS,
            invalidSelections: [],
          });
          await filterBar.toggleFilterEnabled('sound.keyword');
          await header.waitUntilLoadingHasFinished();
        });

        it('Negated filters apply to options control', async () => {
          await filterBar.toggleFilterNegated('sound.keyword');
          await header.waitUntilLoadingHasFinished();

          const suggestions = pick(OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS, [
            'hiss',
            'grrr',
            'meow',
            'growl',
            'grr',
          ]);
          await dashboardControls.ensureAvailableOptionsEqual(controlId, {
            suggestions,
            invalidSelections: [],
          });
        });
      });

      after(async () => {
        await dashboard.clickDiscardChanges();
      });
    });

    describe('Selections made in control apply to dashboard', () => {
      it('Can search options list for available options', async () => {
        await dashboardControls.optionsListOpenPopover(controlId);
        await dashboardControls.optionsListPopoverSearchForOption('meo');
        await dashboardControls.ensureAvailableOptionsEqual(
          controlId,
          {
            suggestions: { meow: OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS.meow },
            invalidSelections: [],
          },
          true
        );
        await dashboardControls.optionsListPopoverClearSearch();
        await dashboardControls.optionsListEnsurePopoverIsClosed(controlId);
      });

      it('Can search options list for available options case insensitive', async () => {
        await dashboardControls.optionsListOpenPopover(controlId);
        await dashboardControls.optionsListPopoverSearchForOption('MEO');
        await dashboardControls.ensureAvailableOptionsEqual(
          controlId,
          {
            suggestions: { meow: OPTIONS_LIST_ANIMAL_SOUND_SUGGESTIONS.meow },
            invalidSelections: [],
          },
          true
        );
        await dashboardControls.optionsListPopoverClearSearch();
        await dashboardControls.optionsListEnsurePopoverIsClosed(controlId);
      });

      it('Can select multiple available options', async () => {
        await dashboardControls.optionsListOpenPopover(controlId);
        await dashboardControls.optionsListPopoverSelectOption('hiss');
        await dashboardControls.optionsListPopoverSelectOption('grr');
        await dashboardControls.optionsListEnsurePopoverIsClosed(controlId);
      });

      it('Selected options appear in control', async () => {
        const selectionString = await dashboardControls.optionsListGetSelectionsString(controlId);
        expect(selectionString).to.be('hiss, grr');
      });

      it('Applies options list control options to dashboard', async () => {
        await dashboard.waitForRenderComplete();
        expect(await pieChart.getPieSliceCount()).to.be(2);
      });

      it('Applies options list control options to dashboard by default on open', async () => {
        await dashboard.gotoDashboardLandingPage();
        await header.waitUntilLoadingHasFinished();
        await dashboard.clickUnsavedChangesContinueEditing(OPTIONS_LIST_DASHBOARD_NAME);
        await dashboard.waitForRenderComplete();
        expect(await pieChart.getPieSliceCount()).to.be(2);

        const selectionString = await dashboardControls.optionsListGetSelectionsString(controlId);
        expect(selectionString).to.be('hiss, grr');
      });

      it('excluding selections has expected results', async () => {
        await dashboardControls.optionsListOpenPopover(controlId);
        await dashboardControls.optionsListPopoverSetIncludeSelections(false);
        await dashboardControls.optionsListEnsurePopoverIsClosed(controlId);

        await dashboard.waitForRenderComplete();
        expect(await pieChart.getPieSliceCount()).to.be(5);
      });

      it('including selections has expected results', async () => {
        await dashboardControls.optionsListOpenPopover(controlId);
        await dashboardControls.optionsListPopoverSetIncludeSelections(true);
        await dashboardControls.optionsListEnsurePopoverIsClosed(controlId);

        await dashboard.waitForRenderComplete();
        expect(await pieChart.getPieSliceCount()).to.be(2);
      });

      after(async () => {
        await dashboard.clickDiscardChanges();
      });
    });

    describe('discarding changes', () => {
      describe('changes can be discarded', () => {
        let selections = '';

        beforeEach(async () => {
          await dashboardControls.optionsListOpenPopover(controlId);
          await dashboardControls.optionsListPopoverSelectOption('bark');

          await dashboardControls.optionsListEnsurePopoverIsClosed(controlId);
          selections = await dashboardControls.optionsListGetSelectionsString(controlId);
          expect(selections).to.equal('bark');
        });

        afterEach(async () => {
          selections = await dashboardControls.optionsListGetSelectionsString(controlId);
          expect(selections).to.equal('Any');
        });

        it('by clicking the discard changes button', async () => {
          await dashboard.clickDiscardChanges();
        });

        it('by switching to view mode', async () => {
          await dashboard.clickCancelOutOfEditMode();
        });
      });

      it('dashboard does not load with unsaved changes when changes are discarded', async () => {
        await dashboard.loadDashboardInEditMode(OPTIONS_LIST_DASHBOARD_NAME);
        await dashboard.ensureMissingUnsavedChangesNotification();
      });
    });
  });
}

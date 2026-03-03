/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';

// The euiTour shows with a small delay, so with 1s we should be safe
const DELAY_FOR = 1000;

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['common', 'console', 'header']);
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const retry = getService('retry');

  describe('console onboarding tour', function describeIndexTests() {
    before(async () => {
      log.debug('navigateTo console');
      await PageObjects.common.navigateToApp('console');
    });

    beforeEach(async () => {
      await browser.refresh();
    });

    const isTourStepOpen = async (tourStepDataSubj: string) => {
      const exists = await find.existsByCssSelector(`[data-test-subj="${tourStepDataSubj}"]`);
      if (!exists) return false;

      const classAttribute = await testSubjects.getAttribute(tourStepDataSubj, 'class');
      return Boolean(classAttribute?.includes('euiPopover-isOpen'));
    };

    const waitForAllStepsHidden = async () => {
      await retry.waitFor('tour steps to be hidden', async () => {
        return (
          !(await isTourStepOpen('shellTourStep')) &&
          !(await isTourStepOpen('editorTourStep')) &&
          !(await isTourStepOpen('historyTourStep')) &&
          !(await isTourStepOpen('configTourStep')) &&
          !(await isTourStepOpen('filesTourStep'))
        );
      });
    };

    const waitForStepOpen = async (tourStepDataSubj: string) => {
      await retry.waitFor(`${tourStepDataSubj} to open`, async () => {
        return await isTourStepOpen(tourStepDataSubj);
      });
    };

    const clickNextAndWaitForStep = async (currentStep: string, nextStep: string) => {
      await waitForStepOpen(currentStep);

      await retry.waitFor(`advance from ${currentStep} to ${nextStep}`, async () => {
        if (await isTourStepOpen(nextStep)) return true;

        if (await isTourStepOpen(currentStep)) {
          await testSubjects.existOrFail('consoleNextTourStepButton');
          await testSubjects.waitForEnabled('consoleNextTourStepButton');
          await PageObjects.console.clickNextTourStep();
        }

        return await isTourStepOpen(nextStep);
      });
    };

    const waitUntilFinishedLoading = async () => {
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.common.sleep(DELAY_FOR);
    };

    const runConsoleTour = async () => {
      await PageObjects.console.clickHelpIcon();
      await PageObjects.console.clickRunTour();
      await waitUntilFinishedLoading();
    };

    it('should open the tour only when the run tour button has been pressed', async () => {
      await waitUntilFinishedLoading();

      // Verify that tour is hidden
      await waitForAllStepsHidden();

      // Run tour
      await runConsoleTour();

      // Verify that first tour step is visible
      await waitForStepOpen('shellTourStep');
    });

    it('displays all five steps in the tour', async () => {
      await waitUntilFinishedLoading();

      // Run tour
      await runConsoleTour();

      log.debug('on Shell tour step');
      await clickNextAndWaitForStep('shellTourStep', 'editorTourStep');

      log.debug('on Editor tour step');
      await clickNextAndWaitForStep('editorTourStep', 'historyTourStep');

      log.debug('on History tour step');
      await clickNextAndWaitForStep('historyTourStep', 'configTourStep');

      log.debug('on Config tour step');
      await clickNextAndWaitForStep('configTourStep', 'filesTourStep');

      log.debug('on Files tour step');
      await waitForStepOpen('filesTourStep');
      // Last tour step should contain the "Complete" button
      expect(await testSubjects.exists('consoleCompleteTourButton')).to.be(true);
      await PageObjects.console.clickCompleteTour();

      // All steps should now be hidden
      await waitForAllStepsHidden();
    });

    it('skipping the tour hides the tour steps', async () => {
      await waitUntilFinishedLoading();

      // Run tour
      await runConsoleTour();

      await retry.waitFor('first tour step to open', async () => {
        return await isTourStepOpen('shellTourStep');
      });

      await testSubjects.existOrFail('consoleSkipTourButton');
      await PageObjects.console.clickSkipTour();

      // Wait for the skip button to be removed, indicating tour has closed
      await testSubjects.waitForDeleted('consoleSkipTourButton');

      // All steps should now be hidden
      await waitForAllStepsHidden();
      expect(await isTourStepOpen('shellTourStep')).to.be(false);
      expect(await isTourStepOpen('editorTourStep')).to.be(false);
      expect(await isTourStepOpen('historyTourStep')).to.be(false);
      expect(await isTourStepOpen('configTourStep')).to.be(false);
      expect(await isTourStepOpen('filesTourStep')).to.be(false);
    });

    it('allows re-running the tour', async () => {
      await waitUntilFinishedLoading();

      // Run tour
      await runConsoleTour();

      // Verify that first tour step is visible
      expect(await isTourStepOpen('shellTourStep')).to.be(true);

      // Skip ongoing tour
      await PageObjects.console.skipTourIfExists();

      // Wait for the skip button to be removed, indicating tour has closed
      await testSubjects.waitForDeleted('consoleSkipTourButton');

      // Verify that tour is hidden
      await waitForAllStepsHidden();

      // Re-run tour
      await runConsoleTour();

      // Verify again that first tour step is visible
      expect(await isTourStepOpen('shellTourStep')).to.be(true);
    });
  });
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

// The euiTour shows with a small delay, so with 1s we should be safe
const DELAY_FOR = 1000;

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['common', 'console', 'header']);
  const testSubjects = getService('testSubjects');

  describe('console onboarding tour', function describeIndexTests() {
    before(async () => {
      log.debug('navigateTo console');
      await PageObjects.common.navigateToApp('console');
    });

    beforeEach(async () => {
      await browser.refresh();
    });

    const isTourStepOpen = async (tourStepDataSubj: string) => {
      const classAttribute = await testSubjects.getAttribute(tourStepDataSubj, 'class');
      return classAttribute?.includes('euiPopover-isOpen');
    };

    const expectAllStepsHidden = async () => {
      expect(await isTourStepOpen('shellTourStep')).to.be(false);
      expect(await isTourStepOpen('editorTourStep')).to.be(false);
      expect(await isTourStepOpen('historyTourStep')).to.be(false);
      expect(await isTourStepOpen('configTourStep')).to.be(false);
      expect(await isTourStepOpen('filesTourStep')).to.be(false);
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
      await expectAllStepsHidden();

      // Run tour
      await runConsoleTour();

      // Verify that first tour step is visible
      expect(await isTourStepOpen('shellTourStep')).to.be(true);
    });

    it('displays all five steps in the tour', async () => {
      const andWaitFor = DELAY_FOR;
      await waitUntilFinishedLoading();

      // Run tour
      await runConsoleTour();

      log.debug('on Shell tour step');
      expect(await isTourStepOpen('shellTourStep')).to.be(true);
      await PageObjects.console.clickNextTourStep(andWaitFor);

      log.debug('on Editor tour step');
      expect(await isTourStepOpen('editorTourStep')).to.be(true);
      await PageObjects.console.clickNextTourStep(andWaitFor);

      log.debug('on History tour step');
      expect(await isTourStepOpen('historyTourStep')).to.be(true);
      await PageObjects.console.clickNextTourStep(andWaitFor);

      log.debug('on Config tour step');
      expect(await isTourStepOpen('configTourStep')).to.be(true);
      await PageObjects.console.clickNextTourStep(andWaitFor);

      log.debug('on Files tour step');
      expect(await isTourStepOpen('filesTourStep')).to.be(true);
      // Last tour step should contain the "Complete" button
      expect(await testSubjects.exists('consoleCompleteTourButton')).to.be(true);
      await PageObjects.console.clickCompleteTour();

      // All steps should now be hidden
      await expectAllStepsHidden();
    });

    it('skipping the tour hides the tour steps', async () => {
      await waitUntilFinishedLoading();

      // Run tour
      await runConsoleTour();

      expect(await isTourStepOpen('shellTourStep')).to.be(true);
      expect(await testSubjects.exists('consoleSkipTourButton')).to.be(true);
      await PageObjects.console.clickSkipTour();

      // All steps should now be hidden
      await expectAllStepsHidden();
    });

    it('allows re-running the tour', async () => {
      await waitUntilFinishedLoading();

      // Run tour
      await runConsoleTour();

      // Verify that first tour step is visible
      expect(await isTourStepOpen('shellTourStep')).to.be(true);

      // Skip ongoing tour
      await PageObjects.console.skipTourIfExists();

      // Verify that tour is hiddern
      await expectAllStepsHidden();

      // Re-run tour
      await runConsoleTour();

      // Verify again that first tour step is visible
      expect(await isTourStepOpen('shellTourStep')).to.be(true);
    });
  });
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const { visualize } = getPageObjects(['visualize']);

  describe('experimental visualizations in visualize app ', function () {
    before(async () => {
      await visualize.initTests();
    });

    describe('experimental visualizations', () => {
      beforeEach(async () => {
        log.debug('navigateToApp visualize');
        await visualize.navigateToNewAggBasedVisualization();
        await visualize.waitForVisualizationSelectPage();
      });

      it('should show an notification when creating beta visualizations', async () => {
        // Try to find a beta visualization.
        const betaTypes = await visualize.getBetaTypeLinks();
        if (betaTypes.length === 0) {
          log.info('No beta visualization found. Skipping this test.');
          return;
        }

        // Create a new visualization
        await betaTypes[0].click();
        // Select a index-pattern/search if this vis requires it
        await visualize.selectVisSourceIfRequired();
        // Check that the beta banner is there and state that this is beta
        const info = await visualize.getExperimentalInfo();
        expect(await info.getVisibleText()).to.contain('beta');
      });

      it('should show an notification when creating experimental visualizations', async () => {
        // Try to find a experimental visualization.
        const experimentalTypes = await visualize.getExperimentalTypeLinks();
        if (experimentalTypes.length === 0) {
          log.info('No experimental visualization found. Skipping this test.');
          return;
        }

        // Create a new visualization
        await experimentalTypes[0].click();
        // Select a index-pattern/search if this vis requires it
        await visualize.selectVisSourceIfRequired();
        // Check that the experimental banner is there and state that this is experimental
        const info = await visualize.getExperimentalInfo();
        expect(await info.getVisibleText()).to.contain('experimental');
      });

      it('should not show that notification for stable visualizations', async () => {
        await visualize.clickAreaChart();
        await visualize.clickNewSearch();
        expect(await visualize.isBetaInfoShown()).to.be(false);
        expect(await visualize.isExperimentalInfoShown()).to.be(false);
      });
    });
  });
}

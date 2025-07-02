/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { visualize } = getPageObjects(['visualize']);
  const a11y = getService('a11y');

  describe('Visualize', () => {
    it('visualize', async () => {
      await visualize.gotoVisualizationLandingPage();
      await a11y.testAppSnapshot();
    });

    it('click on create visualize wizard', async () => {
      await visualize.navigateToNewVisualization();
      await a11y.testAppSnapshot();
    });

    it('create visualize button', async () => {
      await visualize.clickAggBasedVisualizations();
      await visualize.waitForVisualizationSelectPage();
      await visualize.clickAreaChart();
      await a11y.testAppSnapshot();
    });
  });
}

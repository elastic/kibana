/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { scoutPageParallelFixture } from '../scout_page/parallel';
import { createVisualRegressionApi, type VisualRegression } from './visual_regression_fixture';
import { setVrFor } from './store';

export const visualRegressionParallelFixture = scoutPageParallelFixture.extend<{
  visualRegression: VisualRegression;
}>({
  visualRegression: [
    async ({ page }, use, testInfo) => {
      const api = createVisualRegressionApi(page, testInfo);
      setVrFor(testInfo, api);
      await use(api);
    },
    { scope: 'test', auto: true },
  ],
});

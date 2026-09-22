/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { scoutTestDistributionStrategies } from '#pipeline-utils';

(async () => {
  const pickedStrategyName: string = process.env.SCOUT_TEST_DISTRIBUTION_STRATEGY || 'configs';

  if (!(pickedStrategyName in scoutTestDistributionStrategies)) {
    const validStrategyNames = Object.keys(scoutTestDistributionStrategies);
    throw new Error(
      `Unknown Scout test distribution strategy: '${pickedStrategyName}'` +
        `\nExpected one of: ${validStrategyNames.join(', ')}`
    );
  }

  await scoutTestDistributionStrategies[pickedStrategyName]();
})();

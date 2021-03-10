/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { loggingSystemMock } from 'src/core/server/mocks';
import { UsageCollectionSetup } from './plugin';
import { CollectorSet } from './collector';
export { Collector, createCollectorFetchContextMock } from './usage_collection.mock';

const createSetupContract = () => {
  return {
    ...new CollectorSet({
      logger: loggingSystemMock.createLogger(),
      maximumWaitTimeForAllCollectorsInS: 1,
    }),
  } as UsageCollectionSetup;
};

export const usageCollectionPluginMock = {
  createSetupContract,
};

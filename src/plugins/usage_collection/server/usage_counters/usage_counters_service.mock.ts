/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { UsageCountersService, UsageCountersServiceSetup } from './usage_counters_service';
import type { UsageCounter } from './usage_counter';

const createSetupContractMock = () => {
  const setupContract: jest.Mocked<UsageCountersServiceSetup> = {
    createUsageCounter: jest.fn(),
    getUsageCounterByDomainId: jest.fn(),
  };

  setupContract.createUsageCounter.mockReturnValue({
    incrementCounter: jest.fn(),
  } as unknown as jest.Mocked<UsageCounter>);

  return setupContract;
};

const createUsageCountersServiceMock = () => {
  const mocked: jest.Mocked<PublicMethodsOf<UsageCountersService>> = {
    setup: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  };

  mocked.setup.mockReturnValue(createSetupContractMock());
  return mocked;
};

export const usageCountersServiceMock = {
  create: createUsageCountersServiceMock,
  createSetupContract: createSetupContractMock,
};

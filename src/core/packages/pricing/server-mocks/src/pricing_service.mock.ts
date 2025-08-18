/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { PricingServiceSetup, PricingServiceStart } from '@kbn/core-pricing-server';
import type { PricingService } from '@kbn/core-pricing-server-internal';

const createSetupContractMock = () => {
  const setupContract: jest.Mocked<PricingServiceSetup> = {
    isFeatureAvailable: jest.fn(),
    registerProductFeatures: jest.fn(),
  };
  return setupContract;
};

const createStartContractMock = () => {
  const startContract: jest.Mocked<PricingServiceStart> = {
    isFeatureAvailable: jest.fn(),
    getActiveProduct: jest.fn(),
  };
  return startContract;
};

export type PricingServiceContract = PublicMethodsOf<PricingService>;

const createMock = () => {
  const mocked: jest.Mocked<PricingServiceContract> = {
    preboot: jest.fn(),
    setup: jest.fn().mockReturnValue(createSetupContractMock()),
    start: jest.fn().mockReturnValue(createStartContractMock()),
    stop: jest.fn(),
  };
  return mocked;
};

export const pricingServiceMock = {
  create: createMock,
  createSetupContract: createSetupContractMock,
  createStartContract: createStartContractMock,
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { PricingServiceStart } from '@kbn/core-pricing-browser';
import type { PricingService } from '@kbn/core-pricing-browser-internal';

const createStartContractMock = (): jest.Mocked<PricingServiceStart> => ({
  isFeatureAvailable: jest.fn(),
});

const createMock = (): jest.Mocked<PublicMethodsOf<PricingService>> => ({
  start: jest.fn().mockImplementation(createStartContractMock),
});

export const pricingServiceMock = {
  create: createMock,
  createStartContract: createStartContractMock,
};

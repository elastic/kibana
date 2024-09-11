/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  DeprecationsServiceSetup,
  DeprecationRegistryProvider,
} from '@kbn/core-deprecations-server';
import type { InternalCoreUsageDataSetup } from '@kbn/core-usage-data-base-server-internal';

export const createDeprecationsSetupMock = () => {
  const setupContract: jest.Mocked<DeprecationsServiceSetup> = {
    registerDeprecations: jest.fn(),
  };

  return setupContract;
};

export const createDeprecationRegistryProviderMock = () => {
  const internalSetupContract: jest.Mocked<DeprecationRegistryProvider> = {
    getRegistry: jest.fn(),
  };

  internalSetupContract.getRegistry.mockReturnValue(createDeprecationsSetupMock());
  return internalSetupContract;
};

export const createCoreUsageDataSetupMock = () => {
  const setupContract: jest.Mocked<InternalCoreUsageDataSetup> = {
    registerType: jest.fn(),
    getClient: jest.fn(),
    registerUsageCounter: jest.fn(),
    incrementUsageCounter: jest.fn(),
  };
  return setupContract;
};

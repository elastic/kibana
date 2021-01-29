/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { LegacyService } from './legacy_service';
import { LegacyConfig, LegacyServiceSetupDeps } from './types';

type LegacyServiceMock = jest.Mocked<PublicMethodsOf<LegacyService> & { legacyId: symbol }>;

const createLegacyServiceMock = (): LegacyServiceMock => ({
  legacyId: Symbol(),
  setupLegacyConfig: jest.fn(),
  setup: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
});

const createLegacyConfigMock = (): jest.Mocked<LegacyConfig> => ({
  get: jest.fn(),
  has: jest.fn(),
  set: jest.fn(),
});

export const legacyServiceMock = {
  create: createLegacyServiceMock,
  createSetupContract: (deps: LegacyServiceSetupDeps) => createLegacyServiceMock().setup(deps),
  createLegacyConfig: createLegacyConfigMock,
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { DeprecationsService } from './deprecations_service';
import type { DeprecationsServiceSetup, DeprecationsServiceStart } from './deprecations_service';

const createServiceMock = (): DeprecationsServiceSetup | DeprecationsServiceStart => ({
  getAllDeprecations: jest.fn().mockResolvedValue([]),
  getDeprecations: jest.fn().mockResolvedValue([]),
});

const createMock = () => {
  const mocked: jest.Mocked<PublicMethodsOf<DeprecationsService>> = {
    setup: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  };

  mocked.setup.mockReturnValue(createServiceMock());
  mocked.start.mockReturnValue(createServiceMock());
  return mocked;
};

export const deprecationsServiceMock = {
  create: createMock,
  createSetupContract: createServiceMock as () => DeprecationsServiceSetup,
  createStartContract: createServiceMock as () => DeprecationsServiceStart,
};

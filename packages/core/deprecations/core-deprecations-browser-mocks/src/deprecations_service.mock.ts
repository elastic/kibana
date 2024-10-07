/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { DeprecationsService } from '@kbn/core-deprecations-browser-internal';
import type { DeprecationsServiceStart } from '@kbn/core-deprecations-browser';

const createServiceMock = (): jest.Mocked<DeprecationsServiceStart> => ({
  getAllDeprecations: jest.fn().mockResolvedValue([]),
  getDeprecations: jest.fn().mockResolvedValue([]),
  isDeprecationResolvable: jest.fn().mockReturnValue(false),
  resolveDeprecation: jest.fn().mockResolvedValue({ status: 'ok', payload: {} }),
});

const createMock = () => {
  const mocked: jest.Mocked<PublicMethodsOf<DeprecationsService>> = {
    setup: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  };

  mocked.setup.mockReturnValue(void 0);
  mocked.start.mockReturnValue(createServiceMock());
  return mocked;
};

export const deprecationsServiceMock = {
  create: createMock,
  createSetupContract: () => void 0,
  createStartContract: createServiceMock,
};

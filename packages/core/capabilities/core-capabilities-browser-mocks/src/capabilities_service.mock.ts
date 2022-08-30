/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { deepFreeze } from '@kbn/std';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type {
  CapabilitiesStart,
  CapabilitiesService,
} from '@kbn/core-capabilities-browser-internal';

const createStartContractMock = (): jest.Mocked<CapabilitiesStart> => ({
  capabilities: deepFreeze({
    catalogue: {},
    management: {},
    navLinks: {},
  }),
});

const createMock = (): jest.Mocked<PublicMethodsOf<CapabilitiesService>> => ({
  start: jest.fn().mockImplementation(createStartContractMock),
});

export const capabilitiesServiceMock = {
  create: createMock,
  createStartContract: createStartContractMock,
};

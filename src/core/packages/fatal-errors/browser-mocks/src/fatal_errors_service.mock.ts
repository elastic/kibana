/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { FatalErrorsSetup } from '@kbn/core-fatal-errors-browser';
import type { FatalErrorsService } from '@kbn/core-fatal-errors-browser-internal';
import { lazyObject } from '@kbn/lazy-object';

const createSetupContractMock = () => {
  const setupContract: jest.Mocked<FatalErrorsSetup> = lazyObject({
    add: jest.fn<never, any>(),
    catch: jest.fn(),
  });

  return setupContract;
};
const createStartContractMock = createSetupContractMock;

type FatalErrorsServiceContract = PublicMethodsOf<FatalErrorsService>;
const createMock = () => {
  const mocked: jest.Mocked<FatalErrorsServiceContract> = lazyObject({
    setup: jest.fn().mockReturnValue(createSetupContractMock()),
    start: jest.fn().mockReturnValue(createStartContractMock()),
  });

  return mocked;
};

export const fatalErrorsServiceMock = {
  create: createMock,
  createSetupContract: createSetupContractMock,
  createStartContract: createStartContractMock,
};

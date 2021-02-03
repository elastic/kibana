/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { FatalErrorsService, FatalErrorsSetup } from './fatal_errors_service';

const createSetupContractMock = () => {
  const setupContract: jest.Mocked<FatalErrorsSetup> = {
    add: jest.fn<never, any>(() => undefined as never),
    get$: jest.fn(),
  };

  return setupContract;
};
const createStartContractMock = createSetupContractMock;

type FatalErrorsServiceContract = PublicMethodsOf<FatalErrorsService>;
const createMock = () => {
  const mocked: jest.Mocked<FatalErrorsServiceContract> = {
    setup: jest.fn(),
    start: jest.fn(),
  };

  mocked.setup.mockReturnValue(createSetupContractMock());
  mocked.start.mockReturnValue(createStartContractMock());
  return mocked;
};

export const fatalErrorsServiceMock = {
  create: createMock,
  createSetupContract: createSetupContractMock,
  createStartContract: createStartContractMock,
};

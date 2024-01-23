/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ReadonlyContainer } from '@kbn/core-di-common';
import type { CoreDiServiceSetup, CoreDiServiceStart } from '@kbn/core-di-server';
import type {
  InternalCoreDiServiceSetup,
  InternalCoreDiServiceStart,
} from '@kbn/core-di-server-internal';

const createReadonlyContainerMock = () => {
  const containerMock: jest.Mocked<ReadonlyContainer> = {
    get: jest.fn(),
  };

  return containerMock;
};

const createSetupContractMock = () => {
  const mock: jest.Mocked<CoreDiServiceSetup> = {
    setupModule: jest.fn(),
  };

  return mock;
};

const createStartContractMock = () => {
  const mock: jest.Mocked<CoreDiServiceStart> & { container: jest.Mocked<ReadonlyContainer> } = {
    container: createReadonlyContainerMock(),
  };

  return mock;
};

const createInternalSetupContractMock = () => {
  const mock: jest.Mocked<InternalCoreDiServiceSetup> = {
    configurePluginModule: jest.fn(),
    createPluginContainer: jest.fn(),
    registerPluginModule: jest.fn(),
    registerGlobalModule: jest.fn(),
    registerRequestModule: jest.fn(),
  };

  return mock;
};

const createInternalStartContractMock = () => {
  const mock: jest.Mocked<InternalCoreDiServiceStart> = {
    getPluginContainer: jest.fn(),
    createRequestContainer: jest.fn(),
    disposeRequestContainer: jest.fn(),
  };

  mock.getPluginContainer.mockReturnValue(createReadonlyContainerMock());
  mock.createRequestContainer.mockReturnValue(createReadonlyContainerMock());

  return mock;
};

export const injectionServiceMock = {
  createReadonlyContainer: createReadonlyContainerMock,
  createSetupContract: createSetupContractMock,
  createStartContract: createStartContractMock,
  createInternalSetupContract: createInternalSetupContractMock,
  createInternalStartContract: createInternalStartContractMock,
};

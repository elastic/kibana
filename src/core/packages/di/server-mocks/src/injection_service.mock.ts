/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Container } from 'inversify';
import type { CoreDiServiceSetup, CoreDiServiceStart } from '@kbn/core-di-common';
import type {
  InternalCoreDiServiceSetup,
  InternalCoreDiServiceStart,
} from '@kbn/core-di-common-internal';
import { MethodKeysOf } from '@kbn/utility-types';

function createContainer() {
  const container = new Container({ defaultScope: 'Singleton', skipBaseClassChecks: true });

  for (const method of ['bind', 'get', 'getAll', 'isBound', 'load']) {
    jest.spyOn(container, method as MethodKeysOf<Container>);
  }

  return container as jest.Mocked<Container>;
}

function createSetupContract() {
  const mock: jest.MockedObjectDeep<CoreDiServiceSetup> = {
    load: jest.fn(),
  };

  return mock;
}

const createStartContract = () => {
  const mock: jest.MockedObjectDeep<CoreDiServiceStart> = {
    getContainer: jest.fn().mockImplementation(createContainer),
  };

  return mock;
};

const createInternalSetupContract = () => {
  const mock: jest.Mocked<InternalCoreDiServiceSetup> = {
    load: jest.fn(),
  };

  return mock;
};

const createInternalStartContract = () => {
  const mock: jest.Mocked<InternalCoreDiServiceStart> = {
    fork: jest.fn(createContainer),
    getContainer: jest.fn().mockImplementation(createContainer),
  };

  return mock;
};

export const injectionServiceMock = {
  createContainer,
  createSetupContract,
  createStartContract,
  createInternalSetupContract,
  createInternalStartContract,
};

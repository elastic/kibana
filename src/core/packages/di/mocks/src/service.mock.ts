/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Container } from 'inversify';
import { once } from 'lodash';
import type { CoreDiServiceSetup, CoreDiServiceStart } from '@kbn/core-di';
import type {
  CoreInjectionService,
  InternalCoreDiServiceSetup,
  InternalCoreDiServiceStart,
} from '@kbn/core-di-internal';
import type { MethodKeysOf, PublicMethodsOf } from '@kbn/utility-types';

function create(): jest.Mocked<PublicMethodsOf<CoreInjectionService>> {
  return {
    setup: jest.fn(createInternalSetupContract),
    start: jest.fn(createInternalStartContract),
  };
}

function createContainer() {
  const container = new Container({ defaultScope: 'Singleton' });
  container.bind(Container).toConstantValue(container);

  for (const method of ['bind', 'get', 'isBound', 'load', 'loadSync', 'unbind', 'unbindAll']) {
    jest.spyOn(container, method as MethodKeysOf<Container>);
  }

  return container as jest.Mocked<Container>;
}

function createSetupContract(): jest.MockedObjectDeep<CoreDiServiceSetup> {
  return {
    getContainer: jest.fn().mockImplementation(once(createContainer)),
  };
}

function createStartContract(): jest.MockedObjectDeep<CoreDiServiceStart> {
  const getContainer = once(createContainer);

  return {
    fork: jest.fn().mockImplementation(
      once(() => {
        const container = new Container({ defaultScope: 'Singleton', parent: getContainer() });
        container.bind(Container).toConstantValue(container);

        return container;
      })
    ),
    getContainer: jest.fn().mockImplementation(getContainer),
  };
}

function createInternalSetupContract(): jest.MockedObjectDeep<InternalCoreDiServiceSetup> {
  return createSetupContract();
}

function createInternalStartContract(): jest.MockedObjectDeep<InternalCoreDiServiceStart> {
  return createStartContract();
}

export const injectionServiceMock = {
  create,
  createSetupContract,
  createStartContract,
  createInternalSetupContract,
  createInternalStartContract,
};

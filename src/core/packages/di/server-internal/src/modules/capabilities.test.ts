/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Container, ContainerModule } from 'inversify';
import { OnSetup } from '@kbn/core-di';
import { injectionServiceMock } from '@kbn/core-di-mocks';
import { CapabilitiesProvider, CoreSetup } from '@kbn/core-di-server';
import type { CoreSetup as TCoreSetup } from '@kbn/core-lifecycle-server';
import { loadCapabilites } from './capabilities';

describe('loadCapabilities', () => {
  let injection: jest.Mocked<ReturnType<typeof injectionServiceMock.createStartContract>>;
  let container: Container;
  let capabilities: jest.Mocked<TCoreSetup['capabilities']>;

  function setup() {
    container.get(OnSetup)(container);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    injection = injectionServiceMock.createStartContract();
    capabilities = { registerProvider: jest.fn() } as unknown as typeof capabilities;
    container = injection.getContainer();
    container.loadSync(new ContainerModule(loadCapabilites));
    container.bind(CoreSetup('capabilities')).toConstantValue(capabilities);
  });

  it('should register capabilities', () => {
    const capabilitiesProvider = () => ({});
    container.bind(CapabilitiesProvider).toConstantValue(capabilitiesProvider);
    setup();

    expect(capabilities.registerProvider).toHaveBeenCalledWith(capabilitiesProvider);
  });
});

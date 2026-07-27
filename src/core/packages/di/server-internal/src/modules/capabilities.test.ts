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
import { capabilitiesServiceMock } from '@kbn/core-capabilities-server-mocks';
import { injectionServiceMock } from '@kbn/core-di-mocks';
import {
  CapabilitiesAccessor,
  CapabilitiesProvider,
  CoreSetup,
  CoreStart,
  Request,
} from '@kbn/core-di-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loadCapabilites } from './capabilities';

describe('loadCapabilities', () => {
  let injection: jest.Mocked<ReturnType<typeof injectionServiceMock.createStartContract>>;
  let container: Container;
  let capabilitiesSetup: ReturnType<typeof capabilitiesServiceMock.createSetupContract>;
  let capabilitiesStart: ReturnType<typeof capabilitiesServiceMock.createStartContract>;
  let request: KibanaRequest;

  function setup() {
    container.get(OnSetup)(container);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    injection = injectionServiceMock.createStartContract();
    capabilitiesSetup = capabilitiesServiceMock.createSetupContract();
    capabilitiesStart = capabilitiesServiceMock.createStartContract();
    request = httpServerMock.createKibanaRequest();
    container = injection.getContainer();
    container.load(new ContainerModule(loadCapabilites));
    container.bind(CoreSetup('capabilities')).toConstantValue(capabilitiesSetup);
    container.bind(CoreStart('capabilities')).toConstantValue(capabilitiesStart);
    container.bind(Request).toConstantValue(request);
  });

  it('should register capabilities', () => {
    const capabilitiesProvider = () => ({});
    container.bind(CapabilitiesProvider).toConstantValue(capabilitiesProvider);
    setup();

    expect(capabilitiesSetup.registerProvider).toHaveBeenCalledWith(capabilitiesProvider);
  });

  it('should not resolve the capabilities when resolving the accessor', () => {
    container.get(CapabilitiesAccessor);

    expect(capabilitiesStart.resolveCapabilities).not.toHaveBeenCalled();
  });

  it('should resolve the capabilities for the current request', async () => {
    const capabilities = { navLinks: {}, management: {}, catalogue: {} };
    capabilitiesStart.resolveCapabilities.mockResolvedValue(capabilities);

    await expect(
      container.get(CapabilitiesAccessor)({ capabilityPath: 'myPlugin.*' })
    ).resolves.toBe(capabilities);
    expect(capabilitiesStart.resolveCapabilities).toHaveBeenCalledWith(request, {
      capabilityPath: 'myPlugin.*',
    });
  });

  it('should create the capabilities accessor only once per scope', () => {
    const fork = injection.fork();

    expect(fork.get(CapabilitiesAccessor)).toBe(fork.get(CapabilitiesAccessor));
  });
});

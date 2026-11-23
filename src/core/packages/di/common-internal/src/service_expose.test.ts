/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ServiceIdentifier } from 'inversify';
import { KibanaContainerModule, Setup, SoftDependencies, Start } from '@kbn/core-di';
import type { InternalCoreDiServiceSetup } from './contracts';
import { CoreInjectionService } from './service';

describe('CoreInjectionService', () => {
  const Greeter = Symbol.for('Greeter') as ServiceIdentifier<string>;

  let service: CoreInjectionService;
  let getContainer: InternalCoreDiServiceSetup['getContainer'];

  beforeEach(() => {
    service = new CoreInjectionService();
    ({ getContainer } = service.setup());
  });

  it('should make a service exposed by one plugin available to another plugin', () => {
    const provider = getContainer(Symbol.for('provider'));
    const consumer = getContainer(Symbol.for('consumer'));
    provider.load(
      new KibanaContainerModule(({ expose }) => {
        expose(Greeter).toConstantValue('hello');
      })
    );

    [provider, consumer].forEach((plugin) => plugin.get(Setup));
    const { ready } = service.start();
    [provider, consumer].forEach((plugin) => plugin.get(Start));
    ready();

    expect(consumer.get(SoftDependencies).get(Greeter)).toBe('hello');
  });

  it('should run collect handlers when the service is ready', () => {
    const handler = jest.fn();
    const owner = getContainer(Symbol.for('owner'));
    const contributor = getContainer(Symbol.for('contributor'));
    owner.load(
      new KibanaContainerModule(({ collect }) => {
        collect(Greeter, handler);
      })
    );
    contributor.load(
      new KibanaContainerModule(({ expose }) => {
        expose(Greeter).toConstantValue('hello');
      })
    );

    [owner, contributor].forEach((plugin) => plugin.get(Setup));
    const { ready } = service.start();
    [owner, contributor].forEach((plugin) => plugin.get(Start));
    expect(handler).not.toHaveBeenCalled();

    ready();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(expect.anything(), 'hello');
  });
});

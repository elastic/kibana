/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  createExtensionPoint,
  ExtensionService,
  KibanaContainerModule,
  OnExtensionsReady,
  Setup,
  Start,
} from '@kbn/core-di';
import type { InternalCoreDiServiceSetup } from './contracts';
import { CoreInjectionService } from './service';

describe('CoreInjectionService', () => {
  const Greeter = createExtensionPoint<string>('test.Greeter');

  let service: CoreInjectionService;
  let getContainer: InternalCoreDiServiceSetup['getContainer'];

  beforeEach(() => {
    service = new CoreInjectionService();
    ({ getContainer } = service.setup());
  });

  it('should make a contribution of one plugin available to another plugin', () => {
    const provider = getContainer(Symbol.for('provider'));
    const consumer = getContainer(Symbol.for('consumer'));
    provider.load(
      new KibanaContainerModule(({ extensions }) => {
        extensions.contribute(Greeter).toConstantValue('hello');
      })
    );

    [provider, consumer].forEach((plugin) => plugin.get(Setup));
    const { ready } = service.start();
    [provider, consumer].forEach((plugin) => plugin.get(Start));
    ready();

    expect(consumer.get(ExtensionService).get(Greeter)).toBe('hello');
  });

  it('should run collect handlers when the service is ready', () => {
    const handler = jest.fn();
    const owner = getContainer(Symbol.for('owner'));
    const contributor = getContainer(Symbol.for('contributor'));
    owner.load(
      new KibanaContainerModule(({ extensions }) => {
        extensions.collect(Greeter, handler);
      })
    );
    contributor.load(
      new KibanaContainerModule(({ extensions }) => {
        extensions.contribute(Greeter).toConstantValue('hello');
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

  it('should serve a classic plugin that gets ExtensionService from its container in setup', () => {
    const greetings: Array<string | undefined> = [];
    const provider = getContainer(Symbol.for('provider'));
    provider.load(
      new KibanaContainerModule(({ extensions }) => {
        extensions.contribute(Greeter).toConstantValue('hello');
      })
    );
    const classic = getContainer(Symbol.for('classic'));
    const extensionService = classic.get(ExtensionService);
    classic
      .bind(OnExtensionsReady)
      .toConstantValue(() => greetings.push(extensionService.get(Greeter)));

    [provider, classic].forEach((plugin) => plugin.get(Setup));
    const { ready } = service.start();
    [provider, classic].forEach((plugin) => plugin.get(Start));
    expect(() => extensionService.get(Greeter)).toThrow(/before all plugins started/);

    ready();
    expect(greetings).toEqual(['hello']);
    expect(extensionService.get(Greeter)).toBe('hello');
  });
});

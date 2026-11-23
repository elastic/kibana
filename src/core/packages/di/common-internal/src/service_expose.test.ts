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
import { CoreInjectionService } from './service';

describe('CoreInjectionService', () => {
  it('should make a service exposed by one plugin available to another plugin', () => {
    const Greeter = Symbol.for('Greeter') as ServiceIdentifier<string>;
    const service = new CoreInjectionService();
    const { getContainer } = service.setup();
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
});

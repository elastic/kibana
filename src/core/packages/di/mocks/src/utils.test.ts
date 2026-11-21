/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ServiceIdentifier } from 'inversify';
import { KibanaContainerModule, SoftDependencies } from '@kbn/core-di';
import { injectionServiceMock } from './service.mock';
import { ready, setup, start } from './utils';

describe('lifecycle utils', () => {
  const Widget = Symbol.for('Widget') as ServiceIdentifier<string>;
  const Registry = Symbol.for('Registry') as ServiceIdentifier<string[]>;
  const Missing = Symbol.for('Missing') as ServiceIdentifier<string>;

  it('should run a module using collect and SoftDependencies through setup, start and ready', () => {
    const container = injectionServiceMock.createSetupContract().getContainer();
    container.load(
      new KibanaContainerModule(({ bind, collect, expose }) => {
        bind(Registry).toConstantValue([]);
        collect(Widget, Registry, (_context, widget, registry) => registry.push(widget));
        expose(Widget).toConstantValue('widget');
      })
    );

    setup(container);
    start(container);
    expect(container.get(Registry)).toEqual([]);

    ready(container);
    expect(container.get(Registry)).toEqual(['widget']);
    expect(container.get(SoftDependencies).get(Widget)).toBe('widget');
    expect(container.get(SoftDependencies).get(Missing)).toBeUndefined();
    expect(container.get(SoftDependencies).getAll(Missing)).toEqual([]);
  });
});

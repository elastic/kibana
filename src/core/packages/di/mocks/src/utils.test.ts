/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ServiceIdentifier } from 'inversify';
import { KibanaContainerModule, OnReady, SoftDependencies } from '@kbn/core-di';
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

  it('should run collectAtSetup on start, before the start hooks', () => {
    const seen: string[][] = [];
    const container = injectionServiceMock.createSetupContract().getContainer();
    container.load(
      new KibanaContainerModule(({ bind, collectAtSetup, expose, onStart }) => {
        bind(Registry).toConstantValue([]);
        collectAtSetup(Widget, Registry, (_context, widget, registry) => registry.push(widget));
        onStart(Registry, (_context, registry) => seen.push([...registry]));
        expose(Widget).toConstantValue('widget');
      })
    );

    setup(container);
    expect(container.get(Registry)).toEqual([]);

    start(container);
    expect(seen).toEqual([['widget']]);
  });

  it('should run every collect handler before the OnReady hooks on ready', () => {
    const seen: string[][] = [];
    const container = injectionServiceMock.createSetupContract().getContainer();
    container.load(
      new KibanaContainerModule(({ bind, collect, expose }) => {
        bind(OnReady).toResolvedValue((registry) => () => seen.push([...registry]), [Registry]);
        bind(Registry).toConstantValue([]);
        collect(Widget, Registry, (_context, widget, registry) => registry.push(widget));
        expose(Widget).toConstantValue('widget');
      })
    );

    setup(container);
    start(container);
    ready(container);
    expect(seen).toEqual([['widget']]);
  });
});

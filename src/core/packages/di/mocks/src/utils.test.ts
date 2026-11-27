/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ServiceIdentifier } from 'inversify';
import {
  createExtensionPoint,
  ExtensionService,
  KibanaContainerModule,
  OnExtensionsReady,
} from '@kbn/core-di';
import { injectionServiceMock } from './service.mock';
import { ready, setup, start } from './utils';

describe('lifecycle utils', () => {
  const Widget = createExtensionPoint<string>('test.Widget');
  const Missing = createExtensionPoint<string>('test.Missing');
  const Registry = Symbol.for('Registry') as ServiceIdentifier<string[]>;

  it('should run a module using extensions and ExtensionService through setup, start and ready', () => {
    const container = injectionServiceMock.createSetupContract().getContainer();
    container.load(
      new KibanaContainerModule(({ bind, extensions }) => {
        bind(Registry).toConstantValue([]);
        extensions.collect(Widget, Registry, (_context, widget, registry) => registry.push(widget));
        extensions.contribute(Widget).toConstantValue('widget');
      })
    );

    setup(container);
    start(container);
    expect(container.get(Registry)).toEqual([]);

    ready(container);
    expect(container.get(Registry)).toEqual(['widget']);
    expect(container.get(ExtensionService).get(Widget)).toBe('widget');
    expect(container.get(ExtensionService).getAll(Widget)).toEqual(['widget']);
    expect(container.get(ExtensionService).get(Missing)).toBeUndefined();
    expect(container.get(ExtensionService).getAll(Missing)).toEqual([]);
  });

  it('should run every collect handler before the OnExtensionsReady hooks on ready', () => {
    const seen: string[][] = [];
    const container = injectionServiceMock.createSetupContract().getContainer();
    container.load(
      new KibanaContainerModule(({ bind, extensions }) => {
        bind(OnExtensionsReady).toResolvedValue(
          (registry) => () => seen.push([...registry]),
          [Registry]
        );
        bind(Registry).toConstantValue([]);
        extensions.collect(Widget, Registry, (_context, widget, registry) => registry.push(widget));
        extensions.contribute(Widget).toConstantValue('widget');
      })
    );

    setup(container);
    start(container);
    ready(container);
    expect(seen).toEqual([['widget']]);
  });
});

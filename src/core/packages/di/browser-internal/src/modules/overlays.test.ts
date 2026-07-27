/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Container, ContainerModule } from 'inversify';
import { injectionServiceMock } from '@kbn/core-di-mocks';
import { CoreStart, Overlays } from '@kbn/core-di-browser';
import { overlayServiceMock } from '@kbn/core-overlays-browser-mocks';
import { loadOverlays } from './overlays';

describe('loadOverlays', () => {
  let container: Container;
  let overlays: ReturnType<typeof overlayServiceMock.createStartContract>;

  beforeEach(() => {
    overlays = overlayServiceMock.createStartContract();
    container = injectionServiceMock.createStartContract().getContainer();
    container.load(new ContainerModule(loadOverlays));
    container.bind(CoreStart('overlays')).toConstantValue(overlays);
  });

  it('should resolve the overlays service', () => {
    expect(container.get(Overlays)).toBe(overlays);
  });
});

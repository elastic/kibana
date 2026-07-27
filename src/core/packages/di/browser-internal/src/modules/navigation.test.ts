/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Container, ContainerModule } from 'inversify';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { injectionServiceMock } from '@kbn/core-di-mocks';
import { CoreStart, Navigation } from '@kbn/core-di-browser';
import { loadNavigation } from './navigation';

describe('loadNavigation', () => {
  let container: Container;
  let application: ReturnType<typeof applicationServiceMock.createStartContract>;

  beforeEach(() => {
    application = applicationServiceMock.createStartContract();
    container = injectionServiceMock.createStartContract().getContainer();
    container.load(new ContainerModule(loadNavigation));
    container.bind(CoreStart('application')).toConstantValue(application);
  });

  it('should resolve the navigation service', () => {
    expect(container.get(Navigation)).toBe(application);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Container, ContainerModule } from 'inversify';
import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import { injectionServiceMock } from '@kbn/core-di-mocks';
import { Analytics, CoreSetup } from '@kbn/core-di-browser';
import { loadAnalytics } from './analytics';

describe('loadAnalytics', () => {
  let container: Container;
  let analytics: ReturnType<typeof analyticsServiceMock.createAnalyticsServiceSetup>;

  beforeEach(() => {
    analytics = analyticsServiceMock.createAnalyticsServiceSetup();
    container = injectionServiceMock.createStartContract().getContainer();
    container.load(new ContainerModule(loadAnalytics));
    container.bind(CoreSetup('analytics')).toConstantValue(analytics);
  });

  it('should resolve the analytics service', () => {
    expect(container.get(Analytics)).toBe(analytics);
  });
});

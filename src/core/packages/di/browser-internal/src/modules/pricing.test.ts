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
import { CoreStart, Pricing } from '@kbn/core-di-browser';
import { pricingServiceMock } from '@kbn/core-pricing-browser-mocks';
import { loadPricing } from './pricing';

describe('loadPricing', () => {
  let container: Container;
  let pricing: ReturnType<typeof pricingServiceMock.createStartContract>;

  beforeEach(() => {
    pricing = pricingServiceMock.createStartContract();
    container = injectionServiceMock.createStartContract().getContainer();
    container.load(new ContainerModule(loadPricing));
    container.bind(CoreStart('pricing')).toConstantValue(pricing);
  });

  it('should resolve the pricing service', () => {
    expect(container.get(Pricing)).toBe(pricing);
  });
});

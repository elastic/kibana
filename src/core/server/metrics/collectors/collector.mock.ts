/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { MetricsCollector } from './types';

const createCollector = <T = any>(
  collectReturnValue: any = {}
): jest.Mocked<MetricsCollector<T>> => {
  const collector: jest.Mocked<MetricsCollector<T>> = {
    collect: jest.fn().mockResolvedValue(collectReturnValue),
    reset: jest.fn(),
  };

  return collector;
};

export const metricsCollectorMock = {
  create: createCollector,
};

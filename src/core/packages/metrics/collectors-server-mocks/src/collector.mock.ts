/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MetricsCollector } from '@kbn/core-metrics-server';

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

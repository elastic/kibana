/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { MetricsCollector } from './types';

const createMock = () => {
  const mocked: jest.Mocked<MetricsCollector<any>> = {
    collect: jest.fn(),
    reset: jest.fn(),
  };

  mocked.collect.mockResolvedValue({});

  return mocked;
};

export const collectorMock = {
  create: createMock,
};

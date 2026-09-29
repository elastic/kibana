/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

export const eventLoopUtilizationMock = vi.fn().mockImplementation(() => ({
  active: 1,
  idle: 1,
  utilization: 1,
}));

vi.doMock('perf_hooks', () => {
  const mocked = {
    performance: {
      eventLoopUtilization: eventLoopUtilizationMock,
    },
  };
  return { ...mocked, default: mocked };
});

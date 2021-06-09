/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const mockMonitorEnable = jest.fn();
export const mockMonitorPercentile = jest.fn();
export const mockMonitorReset = jest.fn();
export const mockMonitorDisable = jest.fn();
export const monitorEventLoopDelay = jest.fn().mockReturnValue({
  enable: mockMonitorEnable,
  percentile: mockMonitorPercentile,
  disable: mockMonitorDisable,
  reset: mockMonitorReset,
});

jest.doMock('perf_hooks', () => ({
  monitorEventLoopDelay,
}));

function createMockedInstance() {}

export const mocked = {
  create: createMockedInstance,
};

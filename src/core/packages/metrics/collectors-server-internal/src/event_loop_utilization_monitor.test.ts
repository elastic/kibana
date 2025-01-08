/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { eventLoopUtilizationMock } from './event_loop_utilization_monitor.test.mocks';
import { EventLoopUtilizationMonitor } from './event_loop_utilization_monitor';

describe('EventLoopUtilizationMonitor', () => {
  afterEach(() => jest.clearAllMocks());

  describe('#constructor', () => {
    test('#constructor collects utilization', () => {
      new EventLoopUtilizationMonitor();
      expect(eventLoopUtilizationMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('#reset', () => {
    test('collects utilization', () => {
      const monitor = new EventLoopUtilizationMonitor();
      monitor.reset();
      expect(eventLoopUtilizationMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('#collect', () => {
    test('collects utilization', () => {
      const monitor = new EventLoopUtilizationMonitor();
      monitor.collect();
      expect(eventLoopUtilizationMock).toHaveBeenCalledTimes(2);
    });

    test('returns values from call to performance.eventLoopUtilization', () => {
      const monitor = new EventLoopUtilizationMonitor();
      expect(monitor.collect()).toMatchInlineSnapshot(`
        Object {
          "active": 1,
          "idle": 1,
          "utilization": 1,
        }
      `);
    });

    test('passes last ELU value from constructor to calculate diff', () => {
      const mockInitialData = {
        active: 0,
        idle: 0,
        utilization: 0,
      };
      eventLoopUtilizationMock.mockImplementationOnce(() => mockInitialData);

      const monitor = new EventLoopUtilizationMonitor();
      monitor.collect();

      expect(eventLoopUtilizationMock).toHaveBeenCalledTimes(2);
      expect(eventLoopUtilizationMock.mock.calls[1][0]).toEqual(mockInitialData);
    });

    test('passes last ELU value from reset to calculate diff', () => {
      const monitor = new EventLoopUtilizationMonitor();
      const mockInitialData = {
        active: 0,
        idle: 0,
        utilization: 0,
      };
      eventLoopUtilizationMock.mockImplementationOnce(() => mockInitialData);

      monitor.reset();
      monitor.collect();

      expect(eventLoopUtilizationMock).toHaveBeenCalledTimes(3);
      expect(eventLoopUtilizationMock.mock.calls[2][0]).toEqual(mockInitialData);
    });
  });
});

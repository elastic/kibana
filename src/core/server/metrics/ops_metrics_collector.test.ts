/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { loggerMock } from '@kbn/logging-mocks';
import {
  mockOsCollector,
  mockProcessCollector,
  mockServerCollector,
} from './ops_metrics_collector.test.mocks';
import { httpServiceMock } from '../http/http_service.mock';
import { OpsMetricsCollector } from './ops_metrics_collector';

describe('OpsMetricsCollector', () => {
  let collector: OpsMetricsCollector;

  beforeEach(() => {
    const hapiServer = httpServiceMock.createInternalSetupContract().server;
    collector = new OpsMetricsCollector(hapiServer, { logger: loggerMock.create() });

    mockOsCollector.collect.mockResolvedValue('osMetrics');
  });

  describe('#collect', () => {
    it('gathers metrics from the underlying collectors', async () => {
      mockOsCollector.collect.mockResolvedValue('osMetrics');
      mockProcessCollector.collect.mockResolvedValue(['processMetrics']);
      mockServerCollector.collect.mockResolvedValue({
        requests: 'serverRequestsMetrics',
        response_times: 'serverTimingMetrics',
      });

      const metrics = await collector.collect();

      expect(mockOsCollector.collect).toHaveBeenCalledTimes(1);
      expect(mockProcessCollector.collect).toHaveBeenCalledTimes(1);
      expect(mockServerCollector.collect).toHaveBeenCalledTimes(1);

      expect(metrics).toEqual({
        collected_at: expect.any(Date),
        process: 'processMetrics',
        processes: ['processMetrics'],
        os: 'osMetrics',
        requests: 'serverRequestsMetrics',
        response_times: 'serverTimingMetrics',
      });
    });
  });

  describe('#reset', () => {
    it('call reset on the underlying collectors', () => {
      collector.reset();

      expect(mockOsCollector.reset).toHaveBeenCalledTimes(1);
      expect(mockProcessCollector.reset).toHaveBeenCalledTimes(1);
      expect(mockServerCollector.reset).toHaveBeenCalledTimes(1);

      collector.reset();

      expect(mockOsCollector.reset).toHaveBeenCalledTimes(2);
      expect(mockProcessCollector.reset).toHaveBeenCalledTimes(2);
      expect(mockServerCollector.reset).toHaveBeenCalledTimes(2);
    });
  });
});

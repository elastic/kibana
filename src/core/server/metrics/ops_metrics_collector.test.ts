/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

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
    collector = new OpsMetricsCollector(hapiServer);

    mockOsCollector.collect.mockResolvedValue('osMetrics');
  });

  describe('#collect', () => {
    it('gathers metrics from the underlying collectors', async () => {
      mockOsCollector.collect.mockResolvedValue('osMetrics');
      mockProcessCollector.collect.mockResolvedValue('processMetrics');
      mockServerCollector.collect.mockResolvedValue({
        requests: 'serverRequestsMetrics',
        response_times: 'serverTimingMetrics',
      });

      const metrics = await collector.collect();

      expect(mockOsCollector.collect).toHaveBeenCalledTimes(1);
      expect(mockProcessCollector.collect).toHaveBeenCalledTimes(1);
      expect(mockServerCollector.collect).toHaveBeenCalledTimes(1);

      expect(metrics).toEqual({
        process: 'processMetrics',
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

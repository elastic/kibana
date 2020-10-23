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

import moment from 'moment';
import { firstValueFrom } from '@kbn/std';
import { Subject } from 'rxjs';

import { configServiceMock } from '../config/mocks';
import { mockOpsCollector } from './metrics_service.test.mocks';
import { MetricsService } from './metrics_service';
import { OpsMetrics } from './types';
import { mockCoreContext } from '../core_context.mock';
import { httpServiceMock } from '../http/http_service.mock';

const testInterval = 100;

const dummyMetrics = { metricA: 'value', metricB: 'otherValue' };

describe('MetricsService', () => {
  const httpMock = httpServiceMock.createInternalSetupContract();
  let metricsService: MetricsService;

  beforeEach(() => {
    jest.useFakeTimers();

    const configService = configServiceMock.create({
      atPath: { interval: moment.duration(testInterval) },
    });
    const coreContext = mockCoreContext.create({ configService });
    metricsService = new MetricsService(coreContext);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('#start', () => {
    it('invokes setInterval with the configured interval', async () => {
      await metricsService.setup({ http: httpMock });
      await metricsService.start();

      expect(setInterval).toHaveBeenCalledTimes(1);
      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), testInterval);
    });

    it('collects the metrics at every interval', async () => {
      mockOpsCollector.collect.mockResolvedValue(dummyMetrics);

      await metricsService.setup({ http: httpMock });
      await metricsService.start();

      expect(mockOpsCollector.collect).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(testInterval);
      expect(mockOpsCollector.collect).toHaveBeenCalledTimes(2);

      jest.advanceTimersByTime(testInterval);
      expect(mockOpsCollector.collect).toHaveBeenCalledTimes(3);
    });

    it('resets the collector after each collection', async () => {
      mockOpsCollector.collect.mockResolvedValue(dummyMetrics);

      await metricsService.setup({ http: httpMock });
      const { getOpsMetrics$ } = await metricsService.start();

      // subscribe to getOptsMetrics$() so we will know when the refreshes
      // are compelete without needing to worry about the replay behavior
      // of creating new subscriptions
      const opsMetrics$ = new Subject();
      getOpsMetrics$().subscribe(opsMetrics$);

      expect(mockOpsCollector.collect).toHaveBeenCalledTimes(1);
      expect(mockOpsCollector.reset).toHaveBeenCalledTimes(1);

      // trigger the start of a refresh with the timer and wait for it
      // to complete by observing the publish to opsMetrics$
      jest.advanceTimersByTime(testInterval);
      await firstValueFrom(opsMetrics$);

      expect(mockOpsCollector.collect).toHaveBeenCalledTimes(2);
      expect(mockOpsCollector.reset).toHaveBeenCalledTimes(2);

      // trigger the start of a refresh with the timer and wait for it
      // to complete by observing the publish to opsMetrics$
      jest.advanceTimersByTime(testInterval);
      await firstValueFrom(opsMetrics$);

      expect(mockOpsCollector.collect).toHaveBeenCalledTimes(3);
      expect(mockOpsCollector.reset).toHaveBeenCalledTimes(3);
    });

    it('throws when called before setup', async () => {
      await expect(metricsService.start()).rejects.toThrowErrorMatchingInlineSnapshot(
        `"#setup() needs to be run first"`
      );
    });

    it('emits the last value on each getOpsMetrics$ call', async () => {
      const firstMetrics = { metric: 'first' };
      const secondMetrics = { metric: 'second' };
      mockOpsCollector.collect
        .mockResolvedValueOnce(firstMetrics)
        .mockResolvedValueOnce(secondMetrics);

      await metricsService.setup({ http: httpMock });
      const { getOpsMetrics$ } = await metricsService.start();

      // subscribe to getOpsMetrics$ once so we can await on emits to the subject
      const originalSub$ = new Subject();
      getOpsMetrics$().subscribe(originalSub$);

      // create a new subscription via getOpsMetrics$ and ensure it gets the first value first
      expect(await firstValueFrom(getOpsMetrics$())).toEqual({ metric: 'first' });

      // trigger the start of a refresh with the timer and wait for it
      // to complete by observing the publish to originalSub$
      jest.advanceTimersByTime(testInterval);
      await firstValueFrom(originalSub$);

      // create a new subscription via getOpsMetrics$ and ensure it gets the second value first
      expect(await firstValueFrom(getOpsMetrics$())).toEqual({ metric: 'second' });
    });
  });

  describe('#stop', () => {
    it('stops the metrics interval', async () => {
      await metricsService.setup({ http: httpMock });
      const { getOpsMetrics$ } = await metricsService.start();

      expect(mockOpsCollector.collect).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(testInterval);
      expect(mockOpsCollector.collect).toHaveBeenCalledTimes(2);

      await metricsService.stop();
      jest.advanceTimersByTime(10 * testInterval);
      expect(mockOpsCollector.collect).toHaveBeenCalledTimes(2);

      getOpsMetrics$().subscribe({ complete: () => {} });
    });

    it('completes the metrics observable', async () => {
      await metricsService.setup({ http: httpMock });
      const { getOpsMetrics$ } = await metricsService.start();

      let completed = false;

      getOpsMetrics$().subscribe({
        complete: () => {
          completed = true;
        },
      });

      await metricsService.stop();

      expect(completed).toEqual(true);
    });
  });
});

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
  EmbeddableTelemetryCollector,
  EmbeddableTelemetryCollectorRegistration,
} from './embeddable_telemetry_collector';

describe('embeddable telemetry collector', () => {
  it('collects for all registrations', async () => {
    interface TelemetryData {
      count: number;
    }
    const getStartingData = () => ({
      count: 0,
    });
    const telemetryFn: any = jest.fn((input: any, collectorData: TelemetryData) => ({
      count: collectorData.count + 1,
    }));

    const collector = new EmbeddableTelemetryCollector(telemetryFn);

    const registration1: EmbeddableTelemetryCollectorRegistration = {
      type: 'type1',
      fetcher: () =>
        Promise.resolve([
          {
            type: 'type1',
          },
          {
            type: 'type1',
          },
          {
            type: 'type1',
          },
        ] as any),
      extractor: () => [],
      getBaseCollectorData: getStartingData,
    };

    const registration2: EmbeddableTelemetryCollectorRegistration = {
      type: 'type2',
      fetcher: () =>
        Promise.resolve([
          {
            type: 'type2',
          },
          {
            type: 'type2',
          },
        ] as any),
      extractor: () => [],
      getBaseCollectorData: getStartingData,
    };

    collector.register(registration1);
    collector.register(registration2);

    const results = await collector.run();
    expect(results.type1.count).toBe(3);
    expect(results.type2.count).toBe(2);
  });

  it('extracts nested embeddables reports their telemetry', async () => {
    interface TelemetryData {
      count: number;
    }
    const getStartingData = () => ({
      count: 0,
    });
    const telemetryFn: any = jest.fn((input: any, collectorData: TelemetryData) => ({
      count: collectorData.count + 1,
    }));

    const collector = new EmbeddableTelemetryCollector(telemetryFn);

    const registration1: EmbeddableTelemetryCollectorRegistration = {
      type: 'type1',
      fetcher: () =>
        Promise.resolve([
          {
            type: 'type1',
          },
          {
            type: 'type1',
          },
          {
            type: 'type1',
          },
        ] as any),
      extractor: () =>
        [
          {
            type: 'type2',
          },
          {
            type: 'type2',
          },
        ] as any,
      getBaseCollectorData: getStartingData,
    };

    const registration2: EmbeddableTelemetryCollectorRegistration = {
      type: 'type2',
      fetcher: () => Promise.resolve([]),
      extractor: () => [],
      getBaseCollectorData: getStartingData,
    };

    collector.register(registration1);
    collector.register(registration2);

    const results = await collector.run();
    expect(results.type1.count).toBe(3);
    expect(results.type2.count).toBe(6); // Each type1 will extract 3 type2
  });

  it('caches the run until timeout', async () => {
    jest.useFakeTimers();
    const telemetryFn = jest.fn();
    const collector = new EmbeddableTelemetryCollector(telemetryFn);

    collector.register({
      type: 'type',
      fetcher: () =>
        Promise.resolve([
          {
            type: 'type',
          },
        ] as any),
      extractor: () => [],
      getBaseCollectorData: () => ({}),
    });

    await collector.run();
    expect(telemetryFn).toHaveBeenCalledTimes(1);

    await collector.run();
    expect(telemetryFn).toHaveBeenCalledTimes(1);

    jest.runAllTimers();
    await collector.run();
    expect(telemetryFn).toHaveBeenCalledTimes(2);
  });
});

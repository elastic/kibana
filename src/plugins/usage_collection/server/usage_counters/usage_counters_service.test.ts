/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable dot-notation */
import { UsageCountersService } from './usage_counters_service';
import { loggingSystemMock, coreMock } from '@kbn/core/server/mocks';
import * as rxOp from 'rxjs/operators';
import moment from 'moment';

const tick = () => {
  jest.useRealTimers();
  return new Promise((resolve) => setTimeout(resolve, 1));
};

describe('UsageCountersService', () => {
  const retryCount = 1;
  const bufferDurationMs = 100;
  const mockNow = 1617954426939;
  const logger = loggingSystemMock.createLogger();
  const coreSetup = coreMock.createSetup();
  const coreStart = coreMock.createStart();

  beforeEach(() => {
    jest.spyOn(moment, 'now').mockReturnValue(mockNow);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('stores data in cache during setup', async () => {
    const usageCountersService = new UsageCountersService({ logger, retryCount, bufferDurationMs });
    const { createUsageCounter } = usageCountersService.setup(coreSetup);

    const usageCounter = createUsageCounter('test-counter');

    usageCounter.incrementCounter({ counterName: 'counterA' });
    usageCounter.incrementCounter({ counterName: 'counterA' });

    const dataInSourcePromise = usageCountersService['source$'].pipe(rxOp.toArray()).toPromise();
    usageCountersService['flushCache$'].next();
    usageCountersService['source$'].complete();
    await expect(dataInSourcePromise).resolves.toHaveLength(2);
  });

  it('registers savedObject type during setup', () => {
    const usageCountersService = new UsageCountersService({ logger, retryCount, bufferDurationMs });
    usageCountersService.setup(coreSetup);
    expect(coreSetup.savedObjects.registerType).toBeCalledTimes(1);
  });

  it('flushes cached data on start', async () => {
    const usageCountersService = new UsageCountersService({ logger, retryCount, bufferDurationMs });

    const mockRepository = coreStart.savedObjects.createInternalRepository();
    const mockIncrementCounter = jest.fn();
    mockRepository.incrementCounter = mockIncrementCounter;

    coreStart.savedObjects.createInternalRepository.mockReturnValue(mockRepository);
    const { createUsageCounter } = usageCountersService.setup(coreSetup);

    const usageCounter = createUsageCounter('test-counter');

    usageCounter.incrementCounter({ counterName: 'counterA' });
    usageCounter.incrementCounter({ counterName: 'counterA' });

    const dataInSourcePromise = usageCountersService['source$'].pipe(rxOp.toArray()).toPromise();
    usageCountersService.start(coreStart);
    usageCountersService['source$'].complete();

    await expect(dataInSourcePromise).resolves.toMatchInlineSnapshot(`
                  Array [
                    Object {
                      "counterName": "counterA",
                      "counterType": "count",
                      "domainId": "test-counter",
                      "incrementBy": 1,
                    },
                    Object {
                      "counterName": "counterA",
                      "counterType": "count",
                      "domainId": "test-counter",
                      "incrementBy": 1,
                    },
                  ]
              `);
  });

  it('buffers data into savedObject', async () => {
    const usageCountersService = new UsageCountersService({ logger, retryCount, bufferDurationMs });

    const mockRepository = coreStart.savedObjects.createInternalRepository();
    const mockIncrementCounter = jest.fn().mockResolvedValue('success');
    mockRepository.incrementCounter = mockIncrementCounter;

    coreStart.savedObjects.createInternalRepository.mockReturnValue(mockRepository);
    const { createUsageCounter } = usageCountersService.setup(coreSetup);
    jest.useFakeTimers('modern');
    const usageCounter = createUsageCounter('test-counter');

    usageCounter.incrementCounter({ counterName: 'counterA' });
    usageCounter.incrementCounter({ counterName: 'counterA' });

    usageCountersService.start(coreStart);
    usageCounter.incrementCounter({ counterName: 'counterA' });
    usageCounter.incrementCounter({ counterName: 'counterB' });
    jest.runOnlyPendingTimers();
    expect(mockIncrementCounter).toBeCalledTimes(2);
    expect(mockIncrementCounter.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "usage-counters",
          "test-counter:09042021:count:counterA",
          Array [
            Object {
              "fieldName": "count",
              "incrementBy": 3,
            },
          ],
          Object {
            "upsertAttributes": Object {
              "counterName": "counterA",
              "counterType": "count",
              "domainId": "test-counter",
            },
          },
        ],
        Array [
          "usage-counters",
          "test-counter:09042021:count:counterB",
          Array [
            Object {
              "fieldName": "count",
              "incrementBy": 1,
            },
          ],
          Object {
            "upsertAttributes": Object {
              "counterName": "counterB",
              "counterType": "count",
              "domainId": "test-counter",
            },
          },
        ],
      ]
    `);
  });

  it('retries errors by `retryCount` times before failing to store', async () => {
    const usageCountersService = new UsageCountersService({
      logger,
      retryCount: 1,
      bufferDurationMs,
    });

    const mockRepository = coreStart.savedObjects.createInternalRepository();
    const mockError = new Error('failed.');
    const mockIncrementCounter = jest.fn().mockImplementation((_, key) => {
      switch (key) {
        case 'test-counter:09042021:count:counterA':
          throw mockError;
        case 'test-counter:09042021:count:counterB':
          return 'pass';
        default:
          throw new Error(`unknown key ${key}`);
      }
    });

    mockRepository.incrementCounter = mockIncrementCounter;

    coreStart.savedObjects.createInternalRepository.mockReturnValue(mockRepository);
    const { createUsageCounter } = usageCountersService.setup(coreSetup);
    jest.useFakeTimers('modern');
    const usageCounter = createUsageCounter('test-counter');

    usageCountersService.start(coreStart);
    usageCounter.incrementCounter({ counterName: 'counterA' });
    usageCounter.incrementCounter({ counterName: 'counterB' });
    jest.runOnlyPendingTimers();

    // wait for retries to kick in on next scheduler call
    await tick();
    // number of incrementCounter calls + number of retries
    expect(mockIncrementCounter).toBeCalledTimes(2 + 1);
    expect(logger.debug).toHaveBeenNthCalledWith(1, 'Store counters into savedObjects', {
      kibana: {
        usageCounters: {
          results: [mockError, 'pass'],
        },
      },
    });
  });

  it('buffers counters within `bufferDurationMs` time', async () => {
    const usageCountersService = new UsageCountersService({
      logger,
      retryCount,
      bufferDurationMs: 30000,
    });

    const mockRepository = coreStart.savedObjects.createInternalRepository();
    const mockIncrementCounter = jest.fn().mockImplementation((_data, key, counter) => {
      expect(counter).toHaveLength(1);
      return { key, incrementBy: counter[0].incrementBy };
    });

    mockRepository.incrementCounter = mockIncrementCounter;

    coreStart.savedObjects.createInternalRepository.mockReturnValue(mockRepository);

    const { createUsageCounter } = usageCountersService.setup(coreSetup);
    jest.useFakeTimers('modern');
    const usageCounter = createUsageCounter('test-counter');

    usageCountersService.start(coreStart);
    usageCounter.incrementCounter({ counterName: 'counterA' });
    usageCounter.incrementCounter({ counterName: 'counterA' });
    jest.advanceTimersByTime(30000);

    usageCounter.incrementCounter({ counterName: 'counterA' });
    jest.runOnlyPendingTimers();

    // wait for debounce to kick in on next scheduler call
    await tick();
    expect(mockIncrementCounter).toBeCalledTimes(2);
    expect(mockIncrementCounter.mock.results.map(({ value }) => value)).toMatchInlineSnapshot(`
      Array [
        Object {
          "incrementBy": 2,
          "key": "test-counter:09042021:count:counterA",
        },
        Object {
          "incrementBy": 1,
          "key": "test-counter:09042021:count:counterA",
        },
      ]
    `);
  });
});

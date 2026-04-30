/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock } from '@kbn/logging-mocks';

import { WorkflowEventLogger } from './workflow_event_logger';
import { createCircuitBreakerError } from '../__fixtures__/circuit_breaker_error';
import type { LogsRepository } from '../repositories/logs_repository';

/**
 * `flushEvents()` is the swallow boundary for log writes. Whatever ES throws —
 * including a circuit breaker that surfaces lazily on first data-stream init —
 * must NOT propagate to the workflow execution loop, because the loop's
 * `finally` block flushes events and a rejection there would crash the
 * surrounding `try`.
 *
 * Tests pin down two contracts:
 *   1. A circuit breaker rejection from `LogsRepository.createLogs` is logged
 *      and swallowed; the failed events are re-queued for a future flush.
 *   2. The next `flushEvents()` call after a transient CB reattempts the
 *      previously-failed events alongside any new ones.
 */

const makeLogsRepository = (): jest.Mocked<Pick<LogsRepository, 'createLogs'>> => ({
  createLogs: jest.fn(),
});

describe('WorkflowEventLogger.flushEvents — circuit breaker resilience', () => {
  it('swallows a circuit breaker rejection from createLogs and re-queues the events', async () => {
    const logsRepository = makeLogsRepository();
    logsRepository.createLogs.mockRejectedValueOnce(createCircuitBreakerError());
    const logger = loggerMock.create();

    const eventLogger = new WorkflowEventLogger(
      logsRepository as unknown as LogsRepository,
      logger
    );

    eventLogger.logInfo('first');
    eventLogger.logInfo('second');

    await expect(eventLogger.flushEvents()).resolves.toBeUndefined();

    expect(logsRepository.createLogs).toHaveBeenCalledTimes(1);
    expect(logsRepository.createLogs.mock.calls[0][0]).toHaveLength(2);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to index workflow events'),
      expect.objectContaining({ eventsCount: 2 })
    );
  });

  it('reattempts re-queued events on the next flush after a transient circuit breaker', async () => {
    const logsRepository = makeLogsRepository();
    logsRepository.createLogs
      .mockRejectedValueOnce(createCircuitBreakerError())
      .mockResolvedValueOnce(undefined);
    const logger = loggerMock.create();

    const eventLogger = new WorkflowEventLogger(
      logsRepository as unknown as LogsRepository,
      logger
    );

    eventLogger.logInfo('event-a');
    await eventLogger.flushEvents();

    eventLogger.logInfo('event-b');
    await eventLogger.flushEvents();

    expect(logsRepository.createLogs).toHaveBeenCalledTimes(2);
    const secondFlushBatch = logsRepository.createLogs.mock.calls[1][0];
    const messages = secondFlushBatch.map((event) => event.message);
    expect(messages).toEqual(expect.arrayContaining(['event-a', 'event-b']));
    expect(secondFlushBatch).toHaveLength(2);
  });

  it('does not produce an unhandled rejection when createLogs rejects with a circuit breaker', async () => {
    const logsRepository = makeLogsRepository();
    logsRepository.createLogs.mockRejectedValue(createCircuitBreakerError());
    const logger = loggerMock.create();

    const eventLogger = new WorkflowEventLogger(
      logsRepository as unknown as LogsRepository,
      logger
    );

    const onUnhandled = jest.fn();
    process.on('unhandledRejection', onUnhandled);

    try {
      eventLogger.logInfo('boom');
      await eventLogger.flushEvents();
      await new Promise((resolve) => setImmediate(resolve));

      expect(onUnhandled).not.toHaveBeenCalled();
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
  });
});

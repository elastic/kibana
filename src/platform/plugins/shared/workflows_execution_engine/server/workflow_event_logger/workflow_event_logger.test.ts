/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';

import type { WorkflowEventLoggerContext, WorkflowEventLoggerOptions } from './types';
import { WorkflowEventLogger } from './workflow_event_logger';
import { WorkflowEventQueue } from './workflow_event_queue';
import { createCircuitBreakerError } from '../__fixtures__/circuit_breaker_error';
import type { LogsRepository, WorkflowLogEvent } from '../repositories/logs_repository';
import { WorkflowTaskManagerAbortError } from '../workflow_task_shutdown';

const createLogsRepositoryMock = () =>
  ({
    createLogs: jest.fn(),
  }) as unknown as jest.Mocked<LogsRepository>;

const createLoggerUnderTest = (
  logsRepository: jest.Mocked<LogsRepository>,
  logger: Logger,
  context: WorkflowEventLoggerContext = {},
  options: WorkflowEventLoggerOptions = {}
) => {
  const eventQueue = new WorkflowEventQueue(logsRepository, logger);
  return {
    eventQueue,
    workflowLogger: new WorkflowEventLogger(logger, eventQueue, context, options),
  };
};

describe('WorkflowEventLogger', () => {
  it('logs info events and preserves context fields', async () => {
    const logsRepository = createLogsRepositoryMock();
    const logger = loggerMock.create();
    const { workflowLogger, eventQueue } = createLoggerUnderTest(logsRepository, logger, {
      workflowId: 'wf-1',
      executionId: 'exec-1',
      stepId: 'step-1',
      stepExecutionId: 'step-exec-1',
      workflowName: 'workflow',
      stepName: 'step',
      stepType: 'atomic',
      spaceId: 'default',
    });

    workflowLogger.logInfo('hello', { tags: ['tag-1'] });
    await eventQueue.flush();

    expect(logsRepository.createLogs).toHaveBeenCalledTimes(1);
    const events = (logsRepository.createLogs as jest.Mock).mock.calls[0][0] as WorkflowLogEvent[];
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual(
      expect.objectContaining({
        message: 'hello',
        level: 'info',
        spaceId: 'default',
        tags: ['tag-1'],
        workflow: expect.objectContaining({
          id: 'wf-1',
          execution_id: 'exec-1',
          step_id: 'step-1',
          step_execution_id: 'step-exec-1',
          name: 'workflow',
          step_name: 'step',
          step_type: 'atomic',
        }),
      })
    );
  });

  it('logs execution errors and re-queues events when indexing fails', async () => {
    const logsRepository = createLogsRepositoryMock();
    const logger = loggerMock.create();
    (logsRepository.createLogs as jest.Mock)
      .mockRejectedValueOnce(createCircuitBreakerError())
      .mockResolvedValueOnce(undefined);
    const { workflowLogger, eventQueue } = createLoggerUnderTest(logsRepository, logger);

    workflowLogger.logError('failure', new Error('boom'));
    await eventQueue.flush();
    await eventQueue.flush();

    expect(logsRepository.createLogs).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to index workflow events'),
      expect.objectContaining({
        eventsCount: 1,
      })
    );
    const indexedEvent = (logsRepository.createLogs as jest.Mock).mock
      .calls[1][0][0] as WorkflowLogEvent;
    expect(indexedEvent.error).toEqual(
      expect.objectContaining({
        message: 'boom',
      })
    );
  });

  it('suppresses and drops indexing errors during best-effort Task Manager abort flushes', async () => {
    const logsRepository = createLogsRepositoryMock();
    const logger = loggerMock.create();
    logsRepository.createLogs.mockRejectedValueOnce(new Error('task-aborted'));
    const { workflowLogger, eventQueue } = createLoggerUnderTest(logsRepository, logger);
    const signal = AbortSignal.abort(new WorkflowTaskManagerAbortError());

    workflowLogger.logInfo('best effort');
    await eventQueue.flush({ signal });
    await eventQueue.flush();

    expect(logsRepository.createLogs).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      'Failed to index workflow events during best-effort flush',
      expect.objectContaining({ eventsCount: 1, error: { message: 'task-aborted' } })
    );
  });

  it('does not suppress indexing errors for non-Task Manager abort signals', async () => {
    const logsRepository = createLogsRepositoryMock();
    const logger = loggerMock.create();
    logsRepository.createLogs.mockRejectedValueOnce(new Error('cancelled'));
    const { workflowLogger, eventQueue } = createLoggerUnderTest(logsRepository, logger);
    const controller = new AbortController();
    controller.abort(new Error('user cancellation'));

    workflowLogger.logInfo('not retryable');
    await eventQueue.flush({ signal: controller.signal });
    await eventQueue.flush();

    expect(logsRepository.createLogs).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to index workflow events: cancelled',
      expect.objectContaining({ eventsCount: 1 })
    );
  });

  it('writes to console logger when enabled', () => {
    const logsRepository = createLogsRepositoryMock();
    const logger = loggerMock.create();
    const { workflowLogger } = createLoggerUnderTest(
      logsRepository,
      logger,
      {},
      {
        enableConsoleLogging: true,
      }
    );

    workflowLogger.logWarn('watch out');
    workflowLogger.logDebug('debugging');
    workflowLogger.logEvent({ message: 'trace', level: 'trace' });

    expect(logger.warn).toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalled();
    expect(logger.trace).toHaveBeenCalled();
  });

  it('creates step loggers and tracks timing events', async () => {
    const logsRepository = createLogsRepositoryMock();
    const logger = loggerMock.create();
    const { workflowLogger, eventQueue } = createLoggerUnderTest(logsRepository, logger, {
      workflowId: 'wf-1',
      executionId: 'exec-1',
      stepId: 'parent-step',
    });

    const stepLogger = workflowLogger.createStepLogger('step-exec-2', 'step-2', 'My Step', 'wait');
    const timingEvent = { event: { action: 'poll' } } as WorkflowLogEvent;
    stepLogger.startTiming(timingEvent);
    stepLogger.stopTiming(timingEvent);
    await eventQueue.flush();

    const events = (logsRepository.createLogs as jest.Mock).mock.calls[0][0] as WorkflowLogEvent[];
    expect(events).toHaveLength(2);
    expect(events[0].event?.action).toBe('poll-start');
    expect(events[1].event?.action).toBe('poll-complete');
    expect(events[1].event?.duration).toEqual(expect.any(Number));
    expect(events[0].workflow?.step_id).toBe('step-2');
    expect(events[0].workflow?.step_execution_id).toBe('step-exec-2');
  });

  it('drains step logger events when the parent flushes', async () => {
    const logsRepository = createLogsRepositoryMock();
    const logger = loggerMock.create();
    const { workflowLogger, eventQueue } = createLoggerUnderTest(logsRepository, logger, {
      workflowId: 'wf-1',
      executionId: 'exec-1',
    });
    const stepLogger = workflowLogger.createStepLogger('step-exec-2', 'step-2', 'My Step', 'wait');

    workflowLogger.logInfo('workflow started');
    stepLogger.logInfo('step started');
    await eventQueue.flush();

    const events = (logsRepository.createLogs as jest.Mock).mock.calls[0][0] as WorkflowLogEvent[];
    expect(events.map((event) => event.message)).toEqual(['workflow started', 'step started']);
    expect(events[1].workflow?.step_id).toBe('step-2');
  });

  it('leaves events logged during a flush for the next flush', async () => {
    const logsRepository = createLogsRepositoryMock();
    const logger = loggerMock.create();
    let releaseFlush: (() => void) | undefined;
    logsRepository.createLogs.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          releaseFlush = resolve;
        })
    );
    const { workflowLogger, eventQueue } = createLoggerUnderTest(logsRepository, logger, {
      workflowId: 'wf-1',
      executionId: 'exec-1',
    });
    const stepLogger = workflowLogger.createStepLogger('step-exec-2', 'step-2', 'My Step', 'wait');

    stepLogger.logInfo('before flush');
    const flushPromise = eventQueue.flush();
    stepLogger.logInfo('during flush');
    releaseFlush?.();
    await flushPromise;

    expect(logsRepository.createLogs).toHaveBeenCalledTimes(1);
    const firstBatch = (logsRepository.createLogs as jest.Mock).mock
      .calls[0][0] as WorkflowLogEvent[];
    expect(firstBatch.map((event) => event.message)).toEqual(['before flush']);

    logsRepository.createLogs.mockResolvedValueOnce(undefined);
    await eventQueue.flush();

    const secondBatch = (logsRepository.createLogs as jest.Mock).mock
      .calls[1][0] as WorkflowLogEvent[];
    expect(secondBatch.map((event) => event.message)).toEqual(['during flush']);
  });

  it('retries the unsent tail ahead of events enqueued during a failed write', async () => {
    const logsRepository = createLogsRepositoryMock();
    const logger = loggerMock.create();
    let rejectFlush: (error: Error) => void = () => {};
    logsRepository.createLogs.mockImplementationOnce(
      () =>
        new Promise<void>((_, reject) => {
          rejectFlush = reject;
        })
    );
    const { workflowLogger, eventQueue } = createLoggerUnderTest(logsRepository, logger);

    for (let i = 0; i < 501; i++) {
      workflowLogger.logInfo(`event-${i}`);
    }

    const flushPromise = eventQueue.flush();
    workflowLogger.logInfo('during failure');
    rejectFlush(createCircuitBreakerError());
    await flushPromise;

    logsRepository.createLogs.mockResolvedValue(undefined);
    await eventQueue.flush();

    const retriedFirstBatch = logsRepository.createLogs.mock.calls[1][0] as WorkflowLogEvent[];
    const retriedSecondBatch = logsRepository.createLogs.mock.calls[2][0] as WorkflowLogEvent[];
    expect(retriedFirstBatch).toHaveLength(500);
    expect(retriedFirstBatch[0].message).toBe('event-0');
    expect(retriedSecondBatch.map((event) => event.message)).toEqual([
      'event-500',
      'during failure',
    ]);
  });

  it('drops the failed batch on Task Manager abort and keeps the unattempted tail', async () => {
    const logsRepository = createLogsRepositoryMock();
    const logger = loggerMock.create();
    logsRepository.createLogs.mockRejectedValueOnce(new Error('task-aborted'));
    const { workflowLogger, eventQueue } = createLoggerUnderTest(logsRepository, logger);
    const signal = AbortSignal.abort(new WorkflowTaskManagerAbortError());

    for (let i = 0; i < 501; i++) {
      workflowLogger.logInfo(`event-${i}`);
    }

    await eventQueue.flush({ signal });

    logsRepository.createLogs.mockResolvedValueOnce(undefined);
    await eventQueue.flush();

    expect(logsRepository.createLogs).toHaveBeenCalledTimes(2);
    const failedBatch = logsRepository.createLogs.mock.calls[0][0] as WorkflowLogEvent[];
    const retriedBatch = logsRepository.createLogs.mock.calls[1][0] as WorkflowLogEvent[];
    expect(failedBatch).toHaveLength(500);
    expect(failedBatch[0].message).toBe('event-0');
    expect(retriedBatch.map((event) => event.message)).toEqual(['event-500']);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('joins an in-flight flush instead of starting a second drain', async () => {
    const logsRepository = createLogsRepositoryMock();
    const logger = loggerMock.create();
    let releaseFlush: () => void = () => {};
    logsRepository.createLogs.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          releaseFlush = resolve;
        })
    );
    const { workflowLogger, eventQueue } = createLoggerUnderTest(logsRepository, logger);

    workflowLogger.logInfo('before flush');
    const firstFlush = eventQueue.flush();
    workflowLogger.logInfo('during flush');
    const secondFlush = eventQueue.flush();

    expect(secondFlush).toBe(firstFlush);
    releaseFlush();
    await firstFlush;

    expect(logsRepository.createLogs).toHaveBeenCalledTimes(1);
    const firstBatch = logsRepository.createLogs.mock.calls[0][0] as WorkflowLogEvent[];
    expect(firstBatch.map((event) => event.message)).toEqual(['before flush']);

    logsRepository.createLogs.mockResolvedValueOnce(undefined);
    await eventQueue.flush();

    expect(logsRepository.createLogs).toHaveBeenCalledTimes(2);
    const nextBatch = logsRepository.createLogs.mock.calls[1][0] as WorkflowLogEvent[];
    expect(nextBatch.map((event) => event.message)).toEqual(['during flush']);
  });

  it('drops a batch Elasticsearch will not retry and indexes the later events', async () => {
    const logsRepository = createLogsRepositoryMock();
    const logger = loggerMock.create();
    logsRepository.createLogs
      .mockRejectedValueOnce(new Error('mapper_parsing_exception'))
      .mockResolvedValue(undefined);
    const { workflowLogger, eventQueue } = createLoggerUnderTest(logsRepository, logger);

    for (let i = 0; i < 501; i++) {
      workflowLogger.logInfo(`event-${i}`);
    }

    await eventQueue.flush();

    expect(logsRepository.createLogs).toHaveBeenCalledTimes(2);
    const droppedBatch = logsRepository.createLogs.mock.calls[0][0] as WorkflowLogEvent[];
    const indexedBatch = logsRepository.createLogs.mock.calls[1][0] as WorkflowLogEvent[];
    expect(droppedBatch).toHaveLength(500);
    expect(droppedBatch[0].message).toBe('event-0');
    expect(indexedBatch.map((event) => event.message)).toEqual(['event-500']);

    await eventQueue.flush();
    expect(logsRepository.createLogs).toHaveBeenCalledTimes(2);
  });

  it('indexes a large backlog in bounded batches', async () => {
    const logsRepository = createLogsRepositoryMock();
    const logger = loggerMock.create();
    const { workflowLogger, eventQueue } = createLoggerUnderTest(logsRepository, logger);

    for (let i = 0; i < 501; i++) {
      workflowLogger.logInfo(`event-${i}`);
    }

    await eventQueue.flush();

    expect(logsRepository.createLogs).toHaveBeenCalledTimes(2);
    expect((logsRepository.createLogs as jest.Mock).mock.calls[0][0]).toHaveLength(500);
    expect((logsRepository.createLogs as jest.Mock).mock.calls[1][0]).toHaveLength(1);
  });
});

/**
 * `WorkflowEventQueue.flush()` is the swallow boundary for log writes. Whatever ES throws —
 * including a circuit breaker that surfaces lazily on first data-stream init —
 * must NOT propagate to the workflow execution loop, because the loop's
 * `finally` block flushes events and a rejection there would crash the
 * surrounding `try`.
 *
 * Tests pin down two contracts:
 *   1. A circuit breaker rejection from `LogsRepository.createLogs` is logged
 *      and swallowed; the failed events are re-queued for a future flush.
 *   2. The next `flush()` call after a transient CB reattempts the
 *      previously-failed events alongside any new ones.
 */
describe('WorkflowEventQueue.flush — circuit breaker resilience', () => {
  it('swallows a circuit breaker rejection from createLogs and re-queues the events', async () => {
    const logsRepository = createLogsRepositoryMock();
    logsRepository.createLogs.mockRejectedValueOnce(createCircuitBreakerError());
    const logger = loggerMock.create();

    const { workflowLogger: eventLogger, eventQueue } = createLoggerUnderTest(
      logsRepository,
      logger
    );

    eventLogger.logInfo('first');
    eventLogger.logInfo('second');

    await expect(eventQueue.flush()).resolves.toBeUndefined();

    expect(logsRepository.createLogs).toHaveBeenCalledTimes(1);
    expect(logsRepository.createLogs.mock.calls[0][0]).toHaveLength(2);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to index workflow events'),
      expect.objectContaining({ eventsCount: 2 })
    );
  });

  it('reattempts re-queued events on the next flush after a transient circuit breaker', async () => {
    const logsRepository = createLogsRepositoryMock();
    logsRepository.createLogs
      .mockRejectedValueOnce(createCircuitBreakerError())
      .mockResolvedValueOnce(undefined);
    const logger = loggerMock.create();

    const { workflowLogger: eventLogger, eventQueue } = createLoggerUnderTest(
      logsRepository,
      logger
    );

    eventLogger.logInfo('event-a');
    await eventQueue.flush();

    eventLogger.logInfo('event-b');
    await eventQueue.flush();

    expect(logsRepository.createLogs).toHaveBeenCalledTimes(2);
    const secondFlushBatch = logsRepository.createLogs.mock.calls[1][0];
    const messages = secondFlushBatch.map((event) => event.message);
    expect(messages).toEqual(expect.arrayContaining(['event-a', 'event-b']));
    expect(secondFlushBatch).toHaveLength(2);
  });

  it('does not produce an unhandled rejection when createLogs rejects with a circuit breaker', async () => {
    const logsRepository = createLogsRepositoryMock();
    logsRepository.createLogs.mockRejectedValue(createCircuitBreakerError());
    const logger = loggerMock.create();

    const { workflowLogger: eventLogger, eventQueue } = createLoggerUnderTest(
      logsRepository,
      logger
    );

    const onUnhandled = jest.fn();
    process.on('unhandledRejection', onUnhandled);

    try {
      eventLogger.logInfo('boom');
      await eventQueue.flush();
      await new Promise((resolve) => setImmediate(resolve));

      expect(onUnhandled).not.toHaveBeenCalled();
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
  });
});

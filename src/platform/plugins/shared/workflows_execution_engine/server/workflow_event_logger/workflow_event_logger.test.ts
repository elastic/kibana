/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import { WorkflowEventLogger } from './workflow_event_logger';
import type { LogsRepository, WorkflowLogEvent } from '../repositories/logs_repository';

const createLoggerMock = () =>
  ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    trace: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger);

const createLogsRepositoryMock = () =>
  ({
    createLogs: jest.fn(),
  } as unknown as jest.Mocked<LogsRepository>);

describe('WorkflowEventLogger', () => {
  it('logs info events and preserves context fields', async () => {
    const logsRepository = createLogsRepositoryMock();
    const logger = createLoggerMock();
    const workflowLogger = new WorkflowEventLogger(logsRepository, logger, {
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
    await workflowLogger.flushEvents();

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
    const logger = createLoggerMock();
    (logsRepository.createLogs as jest.Mock)
      .mockRejectedValueOnce(new Error('index-fail'))
      .mockResolvedValueOnce(undefined);
    const workflowLogger = new WorkflowEventLogger(logsRepository, logger);

    workflowLogger.logError('failure', new Error('boom'));
    await workflowLogger.flushEvents();
    await workflowLogger.flushEvents();

    expect(logsRepository.createLogs).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to index workflow events: index-fail'),
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

  it('writes to console logger when enabled', () => {
    const logsRepository = createLogsRepositoryMock();
    const logger = createLoggerMock();
    const workflowLogger = new WorkflowEventLogger(
      logsRepository,
      logger,
      {},
      { enableConsoleLogging: true }
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
    const logger = createLoggerMock();
    const workflowLogger = new WorkflowEventLogger(logsRepository, logger, {
      workflowId: 'wf-1',
      executionId: 'exec-1',
      stepId: 'parent-step',
    });

    const stepLogger = workflowLogger.createStepLogger('step-exec-2', 'step-2', 'My Step', 'wait');
    const timingEvent = { event: { action: 'poll' } } as WorkflowLogEvent;
    stepLogger.startTiming(timingEvent);
    stepLogger.stopTiming(timingEvent);
    await stepLogger.flushEvents();

    const events = (logsRepository.createLogs as jest.Mock).mock.calls[0][0] as WorkflowLogEvent[];
    expect(events).toHaveLength(2);
    expect(events[0].event?.action).toBe('poll-start');
    expect(events[1].event?.action).toBe('poll-complete');
    expect(events[1].event?.duration).toEqual(expect.any(Number));
    expect(events[0].workflow?.step_id).toBe('step-2');
    expect(events[0].workflow?.step_execution_id).toBe('step-exec-2');
  });
});

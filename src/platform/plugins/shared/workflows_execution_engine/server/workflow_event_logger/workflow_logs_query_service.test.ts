/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import { WorkflowLogsQueryService } from './workflow_logs_query_service';
import type { LogsRepository } from '../repositories/logs_repository';

const createLoggerMock = () =>
  ({
    error: jest.fn(),
  } as unknown as Logger);

describe('WorkflowLogsQueryService', () => {
  it('maps paging fields for repository search helpers', async () => {
    const repository = { searchLogs: jest.fn().mockResolvedValue({ total: 0, logs: [] }) };
    const service = new WorkflowLogsQueryService(
      repository as unknown as LogsRepository,
      createLoggerMock()
    );

    await service.getExecutionLogs({
      executionId: 'exec-1',
      page: 2,
      size: 50,
      sortField: 'timestamp',
    });

    expect(repository.searchLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        executionId: 'exec-1',
        limit: 50,
        offset: 50,
      })
    );
  });

  it('throws validation errors for missing required params', async () => {
    const logger = createLoggerMock();
    const service = new WorkflowLogsQueryService({} as LogsRepository, logger);

    expect(() => service.getExecutionLogs({} as any)).toThrow(
      'Execution logs: Execution ID is required'
    );
    expect(() => service.getStepLogs({ executionId: 'exec-1' } as any)).toThrow(
      'Step logs: Execution ID and step execution ID are required'
    );
    await expect(service.getLogsByLevel({} as any)).rejects.toThrow(
      'Logs by level: Level is required'
    );
    expect(logger.error).toHaveBeenCalledTimes(3);
  });

  it('rethrows repository failures from getRecentLogs', async () => {
    const logger = createLoggerMock();
    const repositoryError = new Error('repository down');
    const repository = { getRecentLogs: jest.fn().mockRejectedValue(repositoryError) };
    const service = new WorkflowLogsQueryService(repository as unknown as LogsRepository, logger);

    await expect(service.getRecentLogs(10)).rejects.toThrow(repositoryError);
    expect(repository.getRecentLogs).toHaveBeenCalledWith(10);
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to get recent workflow logs',
      repositoryError
    );
  });
});

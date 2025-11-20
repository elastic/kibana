/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as generateUuid } from 'uuid';
import type {
  LogSearchResult,
  LogsRepository,
  WorkflowLogEvent,
} from '../../server/repositories/logs_repository';

export class LogsRepositoryMock implements Required<LogsRepository> {
  public logs = new Map<string, WorkflowLogEvent>();

  public initialize(): Promise<void> {
    return Promise.resolve();
  }
  public createLogs(logEvents: WorkflowLogEvent[]): Promise<void> {
    logEvents.forEach((event) => {
      this.logs.set(generateUuid(), event);
    });
    return Promise.resolve();
  }

  public getExecutionLogs(executionId: string): Promise<LogSearchResult> {
    const logs = Array.from(this.logs.values()).filter((log) => log.executionId === executionId);
    return Promise.resolve({
      total: logs.length,
      logs: logs as any[],
    });
  }

  public getLogsByLevel(level: string, executionId?: string | undefined): Promise<LogSearchResult> {
    const logs = Array.from(this.logs.values()).filter((log) =>
      executionId ? log.level === level && log.executionId === executionId : log.level === level
    );
    return Promise.resolve({
      total: logs.length,
      logs: logs as any[],
    });
  }

  public getRecentLogs(limit?: number): Promise<LogSearchResult> {
    const logs = Array.from(this.logs.values()).slice(0, limit);
    return Promise.resolve({
      total: logs.length,
      logs: logs as any[],
    });
  }

  public getStepLogs(executionId: string, stepId: string): Promise<LogSearchResult> {
    const logs = Array.from(this.logs.values()).filter(
      (log) => log.executionId === executionId && log.stepId === stepId
    );
    return Promise.resolve({
      total: logs.length,
      logs: logs as any[],
    });
  }
}

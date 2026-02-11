/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { QueryDslQueryContainer, SortOrder } from '@elastic/elasticsearch/lib/api/types';
import type { DataStreamsStart } from '@kbn/core-data-streams-server';
import type { ClientSearchRequest } from '@kbn/data-streams';
import { initializeDataStreamClient, type WorkflowLogEvent } from './data_stream';

export interface LogSearchResult {
  total: number;
  logs: WorkflowLogEvent[];
}

export interface SearchLogsParams {
  // pagination
  sortField?: string;
  sortOrder?: SortOrder;
  limit?: number;
  offset?: number;

  // space
  spaceId?: string;

  // fields
  level?: string;
  executionId?: string;
  stepExecutionId?: string;
  stepId?: string;
}

export class LogsRepository {
  constructor(private readonly coreDataStreams: DataStreamsStart) {}

  public async createLogs(logEvents: WorkflowLogEvent[]): Promise<void> {
    const dataStreamClient = await initializeDataStreamClient(this.coreDataStreams);

    await dataStreamClient.create({
      documents: logEvents,
    });
  }

  public async getRecentLogs(limit: number = 100): Promise<LogSearchResult> {
    return this.searchDataStream({
      query: { match_all: {} },
      size: limit,
    });
  }

  public async searchLogs(params: SearchLogsParams): Promise<LogSearchResult> {
    const { limit = 100, offset = 0, sortField = '@timestamp', sortOrder = 'desc' } = params;

    // Map API field names to Elasticsearch field names
    const fieldMapping: Record<string, string> = {
      timestamp: '@timestamp',
      '@timestamp': '@timestamp',
    };
    const mappedSortField = fieldMapping[sortField] || sortField;

    const mustQueries: QueryDslQueryContainer[] = [];

    if (typeof params.executionId === 'string') {
      mustQueries.push({
        term: { 'workflow.execution_id': params.executionId },
      });
    }

    if (typeof params.stepExecutionId === 'string') {
      mustQueries.push({
        term: { 'workflow.step_execution_id': params.stepExecutionId },
      });
    }

    if (typeof params.stepId === 'string') {
      mustQueries.push({
        term: { 'workflow.step_id': params.stepId },
      });
    }

    if (typeof params.level === 'string') {
      mustQueries.push({
        term: { level: params.level },
      });
    }

    if (typeof params.spaceId === 'string') {
      mustQueries.push({
        term: { spaceId: params.spaceId },
      });
    }

    return this.searchDataStream({
      size: limit,
      from: offset,
      query: {
        bool: {
          must: mustQueries,
        },
      },
      sort: [{ [mappedSortField]: sortOrder }],
    });
  }

  private async searchDataStream(query: ClientSearchRequest): Promise<LogSearchResult> {
    const dataStreamClient = await initializeDataStreamClient(this.coreDataStreams);

    const response = await dataStreamClient.search({
      sort: [{ '@timestamp': { order: 'desc' } }],
      size: 1000,
      ...query,
    });

    return {
      total:
        typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total?.value || 0,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      logs: response.hits.hits.map((hit) => hit._source!),
    };
  }
}

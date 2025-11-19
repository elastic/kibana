/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { DataStreamsStart } from '@kbn/core-data-streams-server';
import type { ClientSearchRequest } from '@kbn/data-streams';
import {
  getDataStreamClient,
  type LogsRepositoryDataStreamClient,
  type WorkflowLogEvent,
} from './data_stream';

export interface LogSearchResult {
  total: number;
  logs: WorkflowLogEvent[];
}

export class LogsRepository {
  private readonly dataStreamClient: LogsRepositoryDataStreamClient;

  constructor(coreDataStreams: DataStreamsStart) {
    this.dataStreamClient = getDataStreamClient(coreDataStreams);
  }

  async createLogs(logEvents: WorkflowLogEvent[]): Promise<void> {
    await this.dataStreamClient.bulk({
      operations: logEvents.flatMap((logEvent) => [{ create: {} }, logEvent]),
    });
  }

  public async searchLogs(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params: any,
    spaceId?: string
  ): Promise<LogSearchResult> {
    const { limit = 100, offset = 0, sortField = '@timestamp', sortOrder = 'desc' } = params;

    // Map API field names to Elasticsearch field names
    const fieldMapping: Record<string, string> = {
      timestamp: '@timestamp',
      '@timestamp': '@timestamp',
    };
    const mappedSortField = fieldMapping[sortField] || sortField;

    const mustQueries: QueryDslQueryContainer[] = [];

    if ('executionId' in params) {
      mustQueries.push({
        term: { 'workflow.execution_id': params.executionId },
      });
    }

    if ('stepExecutionId' in params && params.stepExecutionId) {
      mustQueries.push({
        term: { 'workflow.step_execution_id': params.stepExecutionId },
      });
    }

    if ('stepId' in params && params.stepId) {
      mustQueries.push({
        term: { 'workflow.step_id': params.stepId },
      });
    }

    if (spaceId) {
      mustQueries.push({
        term: { spaceId },
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
      sort: [{ [mappedSortField]: { order: sortOrder } }],
    });
  }

  public async getExecutionLogs(executionId: string): Promise<LogSearchResult> {
    const query = {
      bool: {
        must: [
          {
            term: {
              'workflow.execution_id': executionId,
            },
          },
        ],
      },
    };

    return this.searchDataStream({ query });
  }

  public async getLogsByLevel(level: string, executionId?: string): Promise<LogSearchResult> {
    const mustClauses: QueryDslQueryContainer[] = [
      {
        term: {
          level,
        },
      },
    ];

    if (executionId) {
      mustClauses.push({
        term: {
          'workflow.execution_id': executionId,
        },
      });
    }

    const query = {
      bool: {
        must: mustClauses,
      },
    };

    return this.searchDataStream({ query });
  }

  public async getRecentLogs(limit: number = 100): Promise<LogSearchResult> {
    const query = {
      match_all: {},
    };

    const response = await this.dataStreamClient.search({
      query,
      sort: [{ '@timestamp': { order: 'desc' } }],
      size: limit,
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

  public async getStepLogs(executionId: string, stepId: string): Promise<LogSearchResult> {
    const query = {
      bool: {
        must: [
          {
            term: {
              'workflow.execution_id': executionId,
            },
          },
          {
            term: {
              'workflow.step_id': stepId,
            },
          },
        ],
      },
    };

    return this.searchDataStream({ query });
  }

  private async searchDataStream(query: ClientSearchRequest): Promise<LogSearchResult> {
    const response = await this.dataStreamClient.search({
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

// const { size = 100, page = 1, sortField = '@timestamp', sortOrder = 'desc' } = params;
//       const from = (page - 1) * size;

//       // Map API field names to Elasticsearch field names
//       const fieldMapping: Record<string, string> = {
//         timestamp: '@timestamp',
//         '@timestamp': '@timestamp',
//       };
//       const mappedSortField = fieldMapping[sortField] || sortField;

//       // eslint-disable-next-line @typescript-eslint/no-explicit-any
//       const mustQueries: any[] = [];

//       if ('executionId' in params) {
//         mustQueries.push({
//           term: { 'workflow.execution_id.keyword': params.executionId },
//         });
//       }

//       if ('stepExecutionId' in params && params.stepExecutionId) {
//         mustQueries.push({
//           term: { 'workflow.step_execution_id.keyword': params.stepExecutionId },
//         });
//       }

//       if ('stepId' in params && params.stepId) {
//         mustQueries.push({
//           term: { 'workflow.step_id.keyword': params.stepId },
//         });
//       }

//       if (spaceId) {
//         mustQueries.push({
//           term: { 'spaceId.keyword': spaceId },
//         });
//       }

//       const response = await this.esClient.search({
//         index: this.logsIndex,
//         size,
//         from,
//         query: {
//           bool: {
//             must: mustQueries,
//           },
//         },
//         sort: [{ [mappedSortField]: { order: sortOrder } }],
//       });

//       // eslint-disable-next-line @typescript-eslint/no-explicit-any
//       const logs = response.hits.hits.map((hit: any) => hit._source);
//       const total =
//         typeof response.hits.total === 'number'
//           ? response.hits.total
//           : response.hits.total?.value || 0;

//       return { total, logs };

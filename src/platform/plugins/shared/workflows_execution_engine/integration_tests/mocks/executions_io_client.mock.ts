/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowStepExecution } from '@kbn/workflows';
import type { StepExecutionRepositoryMock } from './step_execution_repository.mock';
import { executionIoId } from '../../server/repositories/data_access_layer/implementations/executions_io/execution_io_id';
import type {
  ExecutionIoCreateDocument,
  ExecutionsIoBulkCreateRequest,
  ExecutionsIoClient,
} from '../../server/repositories/data_access_layer/implementations/executions_io/executions_io_data_client';
import type { EsExecutionIo } from '../../server/repositories/data_access_layer/implementations/executions_io/types';
import type {
  BulkItemResponse,
  BulkResponse,
  GetExecutionsByIdsResponse,
} from '../../server/repositories/data_access_layer/types';

const IO_INDEX = 'workflows-executions-io';

/**
 * In-memory executions IO client for integration tests.
 * Create is once-only, matching the data stream. Stored values are also copied
 * onto the step execution record so existing assertions can keep reading
 * `input` and `output` from there.
 */
export class InMemoryExecutionsIoClient implements ExecutionsIoClient {
  private readonly documents = new Map<string, EsExecutionIo>();

  constructor(private readonly stepExecutions: StepExecutionRepositoryMock) {
    stepExecutions.setIoProjection((step) => this.project(step));
  }

  public clear(): void {
    this.documents.clear();
  }

  public async getByIds(ids: string[]): Promise<GetExecutionsByIdsResponse<EsExecutionIo>> {
    if (ids.length === 0) {
      return { items: [], missing: [] };
    }

    const items: GetExecutionsByIdsResponse<EsExecutionIo>['items'] = [];
    const missing: string[] = [];
    for (const id of ids) {
      const document = this.documents.get(id);
      if (document) {
        items.push({ document, index: IO_INDEX, seqNo: 1, primaryTerm: 1 });
      } else {
        missing.push(id);
      }
    }
    return { items, missing };
  }

  public async bulkCreate(request: ExecutionsIoBulkCreateRequest): Promise<BulkResponse> {
    if (request.documents.length === 0) {
      return { items: [], errors: false };
    }

    const timestamp = new Date().toISOString();
    const items: BulkItemResponse[] = [];
    for (const document of request.documents) {
      items.push(this.createOne(document, timestamp));
    }
    return { items, errors: items.some((item) => item.error !== undefined) };
  }

  private createOne(document: ExecutionIoCreateDocument, timestamp: string): BulkItemResponse {
    const id = executionIoId(document.type, document.executionId);
    if (this.documents.has(id)) {
      return {
        id,
        index: '',
        error: {
          type: 'version_conflict_engine_exception',
          reason: 'document already exists',
        },
      };
    }

    const stored: EsExecutionIo = {
      ...document,
      id,
      '@timestamp': document['@timestamp'] || timestamp,
    };
    this.documents.set(id, stored);
    const step = this.stepExecutions.stepExecutions.get(document.executionId);
    if (step) {
      this.project(step);
    }
    return { id, index: IO_INDEX, seqNo: 1, primaryTerm: 1, result: 'created' };
  }

  private project(step: EsWorkflowStepExecution): void {
    const input = this.documents.get(executionIoId('input', step.id));
    const output = this.documents.get(executionIoId('output', step.id));
    if (input && input.value != null) {
      step.input = input.value;
    }
    if (output) {
      step.output = output.value ?? null;
    }
  }
}

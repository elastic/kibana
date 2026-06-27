/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { EsWorkflowStepExecution, SerializedError } from '@kbn/workflows';
import { ExecutionStatus, isTerminalStatus } from '@kbn/workflows';
import { resolveDocumentVersionsByIds } from './document_version';
import { getDocumentsById } from './get_doc_by_id';
import { resolveWriteIndex } from './resolve_write_index';
import { WORKFLOWS_STEP_EXECUTIONS_INDEX } from '../../common';

export type StepExecutionField = keyof EsWorkflowStepExecution;

export type StepExecutionWrite =
  | { operation: 'create'; doc: Partial<EsWorkflowStepExecution> }
  | {
      operation: 'update';
      doc: Partial<EsWorkflowStepExecution>;
    };

export class StepExecutionRepository {
  private dataStreamName = WORKFLOWS_STEP_EXECUTIONS_INDEX;

  constructor(private esClient: ElasticsearchClient) {}

  /**
   * Resolves the current write index backing the step executions alias.
   * This is called once when a workflow execution starts so the backing
   * index name can be pinned on the execution document, ensuring all
   * step docs for that execution land in the same backing index even
   * if ILM rolls over mid-execution.
   */
  public async resolveWriteIndex(): Promise<string> {
    return resolveWriteIndex({ esClient: this.esClient, dataStreamName: this.dataStreamName });
  }

  /**
   * Searches for step executions by workflow execution ID.
   *
   * @param executionId - The ID of the workflow execution to search for step executions.
   * @returns A promise that resolves to an array of step executions associated with the given execution ID.
   */
  public async searchStepExecutionsByExecutionId(
    executionId: string
  ): Promise<EsWorkflowStepExecution[]> {
    const response = await this.esClient.search<EsWorkflowStepExecution>({
      index: this.dataStreamName,
      query: {
        match: { workflowRunId: executionId },
      },
      sort: 'startedAt:desc',
      size: 10000, // TODO: without it, it returns up to 10 results by default. We should improve this.
    });

    const docs: EsWorkflowStepExecution[] = [];
    for (const hit of response.hits.hits) {
      if (hit._source) {
        docs.push(hit._source);
      }
    }
    return docs;
  }

  /**
   * Fetches all step executions for a workflow execution.
   * Uses mget (real-time, O(1)) when stepExecutionIds are available,
   * falls back to search for backward compatibility with older executions.
   */
  public async getStepExecutionsByWorkflowExecution(
    workflowExecutionId: string,
    stepExecutionIds?: string[]
  ): Promise<EsWorkflowStepExecution[]> {
    if (stepExecutionIds && stepExecutionIds.length > 0) {
      return this.getStepExecutionsByIds(stepExecutionIds);
    }
    return this.searchStepExecutionsByExecutionId(workflowExecutionId);
  }

  /*
   * Retrieves step executions by their IDs using mget (O(1) operation).
   * This is real-time (reads from translog) and doesn't require index refresh.
   *
   * Boundary normalisation: ES collapses `undefined` to "missing", but the
   * engine relies on the `null` (FAILED) vs `undefined` (evicted) distinction
   * for `output`. When the caller explicitly asked for `output` via
   * `sourceIncludes` and ES returns the doc without that field, normalise to
   * `null` so downstream code sees `JsonValue | null` instead of having to
   * coerce. Open-projection calls (no `sourceIncludes`) preserve ES's exact
   * shape so existing consumers are not affected.
   *
   * @param stepExecutionIds - The IDs of the step executions to retrieve.
   * @returns A promise that resolves to an array of step executions.
   */
  public async getStepExecutionsByIds(
    stepExecutionIds: string[],
    sourceIncludes?: StepExecutionField[],
    sourceExcludes?: StepExecutionField[],
    stepsExecutionIndex?: string
  ): Promise<EsWorkflowStepExecution[]> {
    const outputExplicitlyRequested = !!sourceIncludes?.includes('output' as StepExecutionField);
    const docs = await getDocumentsById<EsWorkflowStepExecution>({
      esClient: this.esClient,
      ids: stepExecutionIds,
      writeIndex: stepsExecutionIndex ?? (await this.resolveWriteIndex()),
      dataStreamName: this.dataStreamName,
      sourceIncludes,
      sourceExcludes,
      entityName: 'step execution',
    });

    return docs.map(({ doc }) => {
      if (outputExplicitlyRequested && doc.output === undefined) {
        return { ...doc, output: null };
      }
      return doc;
    });
  }

  /**
   * Marks non-terminal step executions for a workflow run as FAILED (e.g. after interrupt recovery).
   */
  public async markNonTerminalStepsFailed(
    workflowExecutionId: string,
    error: SerializedError
  ): Promise<void> {
    const stepExecutions = await this.searchStepExecutionsByExecutionId(workflowExecutionId);
    const nonTerminalSteps = stepExecutions.filter((step) => !isTerminalStatus(step.status));

    if (nonTerminalSteps.length === 0) {
      return;
    }

    const finishedAt = new Date().toISOString();
    await this.bulkUpsert(
      nonTerminalSteps.map((step) => ({
        operation: 'update',
        doc: {
          id: step.id,
          status: ExecutionStatus.FAILED,
          error,
          finishedAt,
        },
      }))
    );
  }

  public async bulkUpsert(writes: StepExecutionWrite[]): Promise<void> {
    if (writes.length === 0) {
      return;
    }

    writes.forEach(({ doc }) => {
      if (!doc.id) {
        throw new Error('Step execution ID is required for upsert');
      }
    });

    const writeIndex = await resolveWriteIndex({
      esClient: this.esClient,
      dataStreamName: this.dataStreamName,
    });

    const updateVersions = await resolveDocumentVersionsByIds<EsWorkflowStepExecution>({
      esClient: this.esClient,
      ids: writes
        .filter(
          (write): write is Extract<StepExecutionWrite, { operation: 'update' }> =>
            write.operation === 'update'
        )
        .map((write) => write.doc.id as string),
      writeIndex,
      dataStreamName: this.dataStreamName,
      entityName: 'step execution',
    });

    const operations: object[] = [];
    for (const write of writes) {
      const { doc } = write;
      if (!doc.id) {
        throw new Error('Step execution ID is required for upsert');
      }
      const id = doc.id;
      const timestamp = doc.startedAt ?? new Date().toISOString();
      const document = {
        ...doc,
        '@timestamp': timestamp,
      };

      if (write.operation === 'update') {
        const version = updateVersions[id];
        operations.push(
          {
            update: {
              _index: version.index,
              _id: id,
              if_seq_no: version.seqNo,
              if_primary_term: version.primaryTerm,
            },
          },
          {
            doc: document,
          }
        );
      } else {
        operations.push(
          {
            create: {
              _index: this.dataStreamName,
              _id: id,
            },
          },
          document
        );
      }
    }

    const bulkResponse = await this.esClient.bulk({
      refresh: false,
      operations,
    });

    if (bulkResponse.errors) {
      const erroredDocuments = bulkResponse.items
        .filter((item) => item.update?.error || item.create?.error)
        .map((item) => ({
          id: item.update?._id ?? item.create?._id,
          error: item.update?.error ?? item.create?.error,
          status: item.update?.status ?? item.create?.status,
        }));

      throw new Error(
        `Failed to upsert ${erroredDocuments.length} step executions: ${JSON.stringify(
          erroredDocuments
        )}`
      );
    }
  }
}

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
import { getStepExecutionsByWorkflowExecution as getStepExecutionsByWorkflowExecutionShared } from '@kbn/workflows/server';
import type { DocumentVersionsById, DocumentWrite } from './document_version';
import { getEsDocumentVersion } from './document_version';
import { WORKFLOWS_STEP_EXECUTIONS_INDEX } from '../../common';

export type StepExecutionField = keyof EsWorkflowStepExecution;

export class StepExecutionRepository {
  private indexName = WORKFLOWS_STEP_EXECUTIONS_INDEX;

  constructor(private esClient: ElasticsearchClient) {}

  /**
   * Resolves the current write index backing the step executions alias.
   * This is called once when a workflow execution starts so the backing
   * index name can be pinned on the execution document, ensuring all
   * step docs for that execution land in the same backing index even
   * if ILM rolls over mid-execution.
   */
  public async resolveWriteIndex(): Promise<string> {
    const { data_streams: dataStreams } = await this.esClient.indices.getDataStream({
      name: this.indexName,
    });
    const writeIndex = dataStreams[0]?.indices.at(-1)?.index_name;
    if (!writeIndex) {
      throw new Error(`No write backing index found for data stream ${this.indexName}`);
    }
    return writeIndex;
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
    const { docs } = await this.searchStepExecutionsWithVersionsByExecutionId(executionId);
    return docs;
  }

  public async searchStepExecutionsWithVersionsByExecutionId(
    executionId: string
  ): Promise<{ docs: EsWorkflowStepExecution[]; versions: DocumentVersionsById }> {
    const response = await this.esClient.search<EsWorkflowStepExecution>({
      index: this.indexName,
      seq_no_primary_term: true,
      query: {
        match: { workflowRunId: executionId },
      },
      sort: 'startedAt:desc',
      size: 10000, // TODO: without it, it returns up to 10 results by default. We should improve this.
    });

    const docs: EsWorkflowStepExecution[] = [];
    const versions: DocumentVersionsById = {};
    for (const hit of response.hits.hits) {
      if (hit._source) {
        docs.push(hit._source);
        versions[hit._source.id] = getEsDocumentVersion({
          seqNo: hit._seq_no,
          primaryTerm: hit._primary_term,
        });
      }
    }
    return { docs, versions };
  }

  /**
   * Fetches all step executions for a workflow execution.
   * Uses mget (real-time, O(1)) when stepExecutionIds are available,
   * falls back to search for backward compatibility with older executions.
   */
  public async getStepExecutionsByWorkflowExecution(
    workflowExecutionId: string,
    stepsExecutionWriteIndex?: string,
    stepExecutionIds?: string[]
  ): Promise<EsWorkflowStepExecution[]> {
    return getStepExecutionsByWorkflowExecutionShared({
      esClient: this.esClient,
      stepsExecutionIndexAlias: this.indexName,
      stepsExecutionIndex: stepsExecutionWriteIndex,
      workflowExecutionId,
      stepExecutionIds,
    });
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
    const { docs } = await this.getStepExecutionsWithVersionsByIds(
      stepExecutionIds,
      sourceIncludes,
      sourceExcludes,
      stepsExecutionIndex
    );
    return docs;
  }

  public async getStepExecutionsWithVersionsByIds(
    stepExecutionIds: string[],
    sourceIncludes?: StepExecutionField[],
    sourceExcludes?: StepExecutionField[],
    stepsExecutionIndex?: string
  ): Promise<{ docs: EsWorkflowStepExecution[]; versions: DocumentVersionsById }> {
    const response = await this.esClient.mget<EsWorkflowStepExecution>({
      index: stepsExecutionIndex ?? this.indexName,
      ids: stepExecutionIds,
      ...(sourceIncludes?.length ? { _source_includes: sourceIncludes } : {}),
      ...(sourceExcludes?.length ? { _source_excludes: sourceExcludes } : {}),
    });

    const outputExplicitlyRequested = !!sourceIncludes?.includes('output' as StepExecutionField);

    const stepExecutions: EsWorkflowStepExecution[] = [];
    const versions: DocumentVersionsById = {};
    for (const doc of response.docs) {
      if ('found' in doc && doc.found && doc._source) {
        const source = doc._source as EsWorkflowStepExecution;
        if (outputExplicitlyRequested && source.output === undefined) {
          source.output = null;
        }
        stepExecutions.push(source);
        versions[source.id] = getEsDocumentVersion({
          seqNo: doc._seq_no,
          primaryTerm: doc._primary_term,
        });
      }
    }
    return { docs: stepExecutions, versions };
  }

  /**
   * Marks non-terminal step executions for a workflow run as FAILED (e.g. after interrupt recovery).
   */
  public async markNonTerminalStepsFailed(
    workflowExecutionId: string,
    error: SerializedError,
    stepsExecutionIndex?: string
  ): Promise<void> {
    const { docs: stepExecutions, versions } =
      await this.searchStepExecutionsWithVersionsByExecutionId(workflowExecutionId);
    const nonTerminalSteps = stepExecutions.filter((step) => !isTerminalStatus(step.status));

    if (nonTerminalSteps.length === 0) {
      return;
    }

    const finishedAt = new Date().toISOString();
    await this.bulkUpsert(
      nonTerminalSteps.map((step) => ({
        doc: {
          id: step.id,
          status: ExecutionStatus.FAILED,
          error,
          finishedAt,
        },
        targetIndex: stepsExecutionIndex,
        ifVersion: versions[step.id],
      }))
    );
  }

  /**
   * @param targetIndex When provided, writes go to this specific backing index
   *   instead of the alias. Used to pin all step docs for one workflow execution
   *   to the backing index that was current when the execution started.
   */
  public async bulkUpsert(
    writes: Array<DocumentWrite<Partial<EsWorkflowStepExecution>>>
  ): Promise<DocumentVersionsById> {
    if (writes.length === 0) {
      return {};
    }

    writes.forEach(({ doc }) => {
      if (!doc.id) {
        throw new Error('Step execution ID is required for upsert');
      }
    });

    const operations: object[] = [];
    for (const { doc, targetIndex, ifVersion } of writes) {
      if (!doc.id) {
        throw new Error('Step execution ID is required for upsert');
      }
      const id = doc.id;
      const timestamp = doc.startedAt ?? new Date().toISOString();
      const document = {
        ...doc,
        '@timestamp': timestamp,
      };

      if (ifVersion) {
        operations.push(
          {
            update: {
              _index: targetIndex ?? this.indexName,
              _id: id,
              if_seq_no: ifVersion.seqNo,
              if_primary_term: ifVersion.primaryTerm,
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
              _index: this.indexName,
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

    const versions: DocumentVersionsById = {};
    for (const item of bulkResponse.items) {
      const op = item.update ?? item.create;
      if (op?._id && !op.error) {
        versions[op._id] = getEsDocumentVersion({
          seqNo: op._seq_no,
          primaryTerm: op._primary_term,
        });
      }
    }
    return versions;
  }
}

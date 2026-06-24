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
import type { DocumentLocatorsById, EsDocumentLocator } from './document_version';
import { getEsDocumentLocator } from './document_version';
import { WORKFLOWS_STEP_EXECUTIONS_INDEX } from '../../common';

export type StepExecutionField = keyof EsWorkflowStepExecution;

const RECENT_BACKING_INDEX_LOOKUP_COUNT = 3;

export type StepExecutionWrite =
  | { operation: 'create'; doc: Partial<EsWorkflowStepExecution> }
  | {
      operation: 'update';
      doc: Partial<EsWorkflowStepExecution>;
      locator: EsDocumentLocator;
    };

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

  private async getRecentBackingIndices(): Promise<string[]> {
    const { data_streams: dataStreams } = await this.esClient.indices.getDataStream({
      name: this.indexName,
    });
    return (
      dataStreams[0]?.indices
        .map((index) => index.index_name)
        .filter((indexName): indexName is string => Boolean(indexName))
        .slice(-RECENT_BACKING_INDEX_LOOKUP_COUNT)
        .reverse() ?? []
    );
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
    const { docs } = await this.searchStepExecutionsWithLocatorsByExecutionId(executionId);
    return docs;
  }

  public async searchStepExecutionsWithLocatorsByExecutionId(
    executionId: string
  ): Promise<{ docs: EsWorkflowStepExecution[]; locators: DocumentLocatorsById }> {
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
    const locators: DocumentLocatorsById = {};
    for (const hit of response.hits.hits) {
      if (hit._source) {
        docs.push(hit._source);
        locators[hit._source.id] = getEsDocumentLocator({
          index: hit._index,
          seqNo: hit._seq_no,
          primaryTerm: hit._primary_term,
        });
      }
    }
    return { docs, locators };
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
    const { docs } = await this.getStepExecutionsWithLocatorsByIds(
      stepExecutionIds,
      sourceIncludes,
      sourceExcludes,
      stepsExecutionIndex
    );
    return docs;
  }

  public async getStepExecutionsWithLocatorsByIds(
    stepExecutionIds: string[],
    sourceIncludes?: StepExecutionField[],
    sourceExcludes?: StepExecutionField[],
    stepsExecutionIndex?: string
  ): Promise<{ docs: EsWorkflowStepExecution[]; locators: DocumentLocatorsById }> {
    const backingIndices = stepsExecutionIndex
      ? [stepsExecutionIndex]
      : await this.getRecentBackingIndices();
    const response = await this.esClient.mget<EsWorkflowStepExecution>({
      ...(stepsExecutionIndex
        ? { index: stepsExecutionIndex, ids: stepExecutionIds }
        : {
            docs: backingIndices.flatMap((index) =>
              stepExecutionIds.map((id) => ({
                _index: index,
                _id: id,
              }))
            ),
          }),
      ...(sourceIncludes?.length ? { _source_includes: sourceIncludes } : {}),
      ...(sourceExcludes?.length ? { _source_excludes: sourceExcludes } : {}),
    });

    const outputExplicitlyRequested = !!sourceIncludes?.includes('output' as StepExecutionField);

    const stepExecutions: EsWorkflowStepExecution[] = [];
    const locators: DocumentLocatorsById = {};
    for (const doc of response.docs) {
      if ('found' in doc && doc.found && doc._source) {
        const source = doc._source as EsWorkflowStepExecution;
        if (outputExplicitlyRequested && source.output === undefined) {
          source.output = null;
        }
        if (locators[source.id]) {
          throw new Error(
            `Found duplicate step execution ID ${source.id} in multiple backing indices`
          );
        }
        stepExecutions.push(source);
        locators[source.id] = getEsDocumentLocator({
          index: doc._index,
          seqNo: doc._seq_no,
          primaryTerm: doc._primary_term,
        });
      }
    }
    if (!stepsExecutionIndex && stepExecutions.length < stepExecutionIds.length) {
      const foundIds = new Set(stepExecutions.map((step) => step.id));
      const missingIds = stepExecutionIds.filter((id) => !foundIds.has(id));
      await this.addSearchFallbackResults({
        ids: missingIds,
        sourceIncludes,
        sourceExcludes,
        outputExplicitlyRequested,
        stepExecutions,
        locators,
      });
    }
    return { docs: stepExecutions, locators };
  }

  private async addSearchFallbackResults({
    ids,
    sourceIncludes,
    sourceExcludes,
    outputExplicitlyRequested,
    stepExecutions,
    locators,
  }: {
    ids: string[];
    sourceIncludes?: StepExecutionField[];
    sourceExcludes?: StepExecutionField[];
    outputExplicitlyRequested: boolean;
    stepExecutions: EsWorkflowStepExecution[];
    locators: DocumentLocatorsById;
  }): Promise<void> {
    const searchResponse = await this.esClient.search<EsWorkflowStepExecution>({
      index: this.indexName,
      seq_no_primary_term: true,
      query: { ids: { values: ids } },
      size: Math.min(ids.length, 10000),
      ...(sourceIncludes?.length ? { _source_includes: sourceIncludes } : {}),
      ...(sourceExcludes?.length ? { _source_excludes: sourceExcludes } : {}),
    });
    for (const hit of searchResponse.hits.hits) {
      if (hit._source) {
        const source = hit._source;
        if (outputExplicitlyRequested && source.output === undefined) {
          source.output = null;
        }
        if (locators[source.id]) {
          throw new Error(
            `Found duplicate step execution ID ${source.id} in multiple backing indices`
          );
        }
        stepExecutions.push(source);
        locators[source.id] = getEsDocumentLocator({
          index: hit._index,
          seqNo: hit._seq_no,
          primaryTerm: hit._primary_term,
        });
      }
    }
  }

  /**
   * Marks non-terminal step executions for a workflow run as FAILED (e.g. after interrupt recovery).
   */
  public async markNonTerminalStepsFailed(
    workflowExecutionId: string,
    error: SerializedError
  ): Promise<void> {
    const { docs: stepExecutions, locators } =
      await this.searchStepExecutionsWithLocatorsByExecutionId(workflowExecutionId);
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
        locator: locators[step.id],
      }))
    );
  }

  public async bulkUpsert(writes: StepExecutionWrite[]): Promise<DocumentLocatorsById> {
    if (writes.length === 0) {
      return {};
    }

    writes.forEach(({ doc }) => {
      if (!doc.id) {
        throw new Error('Step execution ID is required for upsert');
      }
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
        operations.push(
          {
            update: {
              _index: write.locator.index,
              _id: id,
              if_seq_no: write.locator.seqNo,
              if_primary_term: write.locator.primaryTerm,
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

    const locators: DocumentLocatorsById = {};
    for (const item of bulkResponse.items) {
      const op = item.update ?? item.create;
      if (op?._id && !op.error) {
        locators[op._id] = getEsDocumentLocator({
          index: op._index,
          seqNo: op._seq_no,
          primaryTerm: op._primary_term,
        });
      }
    }
    return locators;
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';

import { NonTerminalExecutionStatuses } from '@kbn/workflows';
import { WORKFLOWS_EXECUTIONS_INDEX, WORKFLOWS_STEP_EXECUTIONS_INDEX } from '../../../common';
import { parseDuration } from '../../utils';

export interface ExecutionIndexCleanupOptions {
  minIndexAge: string;
}

interface BackingIndexCandidate {
  indexName: string;
  isWriteIndex: boolean;
}

const listBackingIndexCandidates = async ({
  esClient,
  aliasName,
  signal,
}: {
  esClient: ElasticsearchClient;
  aliasName: string;
  signal?: AbortSignal;
}): Promise<BackingIndexCandidate[]> => {
  const aliasExists = await esClient.indices.existsAlias({ name: aliasName }, { signal });
  if (!aliasExists) {
    return [];
  }

  const aliasInfo = await esClient.indices.getAlias({ name: aliasName }, { signal });
  const candidates: BackingIndexCandidate[] = [];

  for (const [indexName, indexAliases] of Object.entries(aliasInfo)) {
    const alias = indexAliases.aliases[aliasName];
    candidates.push({
      indexName,
      isWriteIndex: alias?.is_write_index === true,
    });
  }

  return candidates;
};

const getIndexCreationTimeMs = async ({
  esClient,
  indexName,
  signal,
}: {
  esClient: ElasticsearchClient;
  indexName: string;
  signal?: AbortSignal;
}): Promise<number | undefined> => {
  const settings = await esClient.indices.getSettings({ index: indexName }, { signal });
  const creationDate = settings[indexName]?.settings?.index?.creation_date;
  if (creationDate === undefined) {
    return undefined;
  }

  const creationTimeMs = parseInt(String(creationDate), 10);
  return Number.isNaN(creationTimeMs) ? undefined : creationTimeMs;
};

export interface CleanupExecutionIndexIfEligibleParams {
  esClient: ElasticsearchClient;
  aliasName: string;
  options: ExecutionIndexCleanupOptions;
  logger: Logger;
  signal?: AbortSignal;
  nowMs?: number;
}

/**
 * Checks if the index has any non-terminal executions.
 */
const hasNonTerminalExecutionsInIndex = async ({
  esClient,
  indexName,
  signal,
}: {
  esClient: ElasticsearchClient;
  indexName: string;
  signal?: AbortSignal;
}): Promise<boolean> => {
  const response = await esClient.search(
    {
      index: indexName,
      size: 0,
      terminate_after: 1,
      track_total_hits: true,
      _source: false,
      query: {
        bool: {
          filter: [
            {
              terms: {
                status: [...NonTerminalExecutionStatuses],
              },
            },
          ],
        },
      },
    },
    { signal }
  );

  const total =
    typeof response?.hits?.total === 'number'
      ? response.hits.total
      : response?.hits?.total?.value ?? 0;

  return total > 0;
};

const deleteTerminalExecutionsFromIndex = async ({
  esClient,
  indexName,
  logger,
  signal,
}: {
  esClient: ElasticsearchClient;
  indexName: string;
  logger: Logger;
  signal?: AbortSignal;
}): Promise<void> => {
  logger.debug(`Skipping ${indexName} deletion: delete non-terminal executions first`);
  await esClient.deleteByQuery(
    {
      index: indexName,
      wait_for_completion: false,
      query: {
        bool: {
          must_not: {
            terms: {
              status: [...NonTerminalExecutionStatuses],
            },
          },
        },
      },
    },
    { signal }
  );
};

/**
 * Deletes non-write backing indexes older than `minIndexAge`.
 *
 * Assumes workflow timeouts are much shorter than `minIndexAge` (e.g. 30d in production),
 * so documents are not scanned for non-terminal execution status before delete.
 */
export const cleanupExecutionIndexIfEligible = async ({
  esClient,
  aliasName,
  options,
  logger,
  signal,
  nowMs = Date.now(),
}: CleanupExecutionIndexIfEligibleParams): Promise<number> => {
  const minIndexAgeMs = parseDuration(options.minIndexAge);
  const candidates = await listBackingIndexCandidates({ esClient, aliasName, signal });
  let deletedCount = 0;

  for (const candidate of candidates) {
    if (signal?.aborted) {
      return deletedCount;
    }

    const anyNonTerminalStatus = await hasNonTerminalExecutionsInIndex({
      esClient,
      indexName: candidate.indexName,
      signal,
    });

    if (anyNonTerminalStatus) {
      await deleteTerminalExecutionsFromIndex({
        esClient,
        indexName: candidate.indexName,
        logger,
        signal,
      });
    } else if (!candidate.isWriteIndex) {
      const creationTimeMs = await getIndexCreationTimeMs({
        esClient,
        indexName: candidate.indexName,
        signal,
      });

      if (creationTimeMs === undefined) {
        logger.warn(`Skipping ${candidate.indexName}: missing index.creation_date`);
      } else {
        const indexAgeMs = nowMs - creationTimeMs;

        if (indexAgeMs < minIndexAgeMs) {
          logger.debug(
            `Skipping ${candidate.indexName}: age ${indexAgeMs}ms is below minIndexAge ${options.minIndexAge}`
          );
        } else {
          await esClient.indices.delete({ index: candidate.indexName }, { signal });
          deletedCount += 1;
          logger.info(
            `Deleted backing index ${candidate.indexName} for alias ${aliasName} (age >= ${options.minIndexAge})`
          );
        }
      }
    }
  }

  return deletedCount;
};

export interface CleanupWorkflowExecutionIndexesParams {
  esClient: ElasticsearchClient;
  options: ExecutionIndexCleanupOptions;
  logger: Logger;
  signal?: AbortSignal;
  nowMs?: number;
}

/** Cleans up eligible workflow and step execution backing indexes. */
export const cleanupWorkflowExecutionIndexes = async ({
  esClient,
  options,
  logger,
  signal,
  nowMs,
}: CleanupWorkflowExecutionIndexesParams): Promise<void> => {
  const aliases = [WORKFLOWS_EXECUTIONS_INDEX, WORKFLOWS_STEP_EXECUTIONS_INDEX];

  for (const aliasName of aliases) {
    if (signal?.aborted) {
      return;
    }

    try {
      const deletedCount = await cleanupExecutionIndexIfEligible({
        esClient,
        aliasName,
        options,
        logger,
        signal,
        nowMs,
      });
      if (deletedCount === 0) {
        logger.debug(`No backing indexes deleted for alias ${aliasName}`);
      }
    } catch (error) {
      logger.error(
        `Failed to cleanup backing indexes for alias ${aliasName}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

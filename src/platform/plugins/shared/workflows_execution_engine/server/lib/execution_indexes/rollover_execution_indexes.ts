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

import {
  WORKFLOWS_EXECUTIONS_INDEX,
  WORKFLOWS_STEP_EXECUTIONS_INDEX,
} from '../../../common';

export interface ExecutionIndexRolloverConditions {
  maxAge: string;
  maxPrimaryShardSize: string;
}

export interface RolloverExecutionIndexIfRequiredParams {
  esClient: ElasticsearchClient;
  aliasName: string;
  conditions: ExecutionIndexRolloverConditions;
  logger: Logger;
  signal?: AbortSignal;
}

/**
 * Rolls the write index for `aliasName` when Elasticsearch rollover conditions are met.
 */
export const rolloverExecutionIndexIfRequired = async ({
  esClient,
  aliasName,
  conditions,
  logger,
  signal,
}: RolloverExecutionIndexIfRequiredParams): Promise<boolean> => {
  const aliasExists = await esClient.indices.existsAlias({ name: aliasName }, { signal });
  if (!aliasExists) {
    logger.debug(`Alias ${aliasName} does not exist, skipping rollover`);
    return false;
  }

  const response = await esClient.indices.rollover(
    {
      alias: aliasName,
      conditions: {
        max_age: conditions.maxAge,
        max_primary_shard_size: conditions.maxPrimaryShardSize,
      },
    },
    { signal }
  );

  if (response.rolled_over) {
    logger.info(
      `Rolled over alias ${aliasName} from ${response.old_index} to ${response.new_index}`
    );
    return true;
  }

  logger.debug(
    `Alias ${aliasName} did not meet rollover conditions (max_age: ${conditions.maxAge}, max_primary_shard_size: ${conditions.maxPrimaryShardSize})`
  );
  return false;
};

export interface RolloverWorkflowExecutionIndexesParams {
  esClient: ElasticsearchClient;
  conditions: ExecutionIndexRolloverConditions;
  logger: Logger;
  signal?: AbortSignal;
}

/** Evaluates rollover conditions for workflow and step execution backing-index aliases. */
export const rolloverWorkflowExecutionIndexes = async ({
  esClient,
  conditions,
  logger,
  signal,
}: RolloverWorkflowExecutionIndexesParams): Promise<void> => {
  const aliases = [WORKFLOWS_EXECUTIONS_INDEX, WORKFLOWS_STEP_EXECUTIONS_INDEX];

  for (const aliasName of aliases) {
    if (signal?.aborted) {
      return;
    }

    try {
      await rolloverExecutionIndexIfRequired({
        esClient,
        aliasName,
        conditions,
        logger,
        signal,
      });
    } catch (error) {
      logger.error(
        `Failed to rollover alias ${aliasName}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

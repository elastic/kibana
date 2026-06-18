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

import { WORKFLOWS_EXECUTIONS_INDEX, WORKFLOWS_STEP_EXECUTIONS_INDEX } from '../../../common';
import { WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS } from '../../../common/workflow_executions_index';

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
  const alias = await esClient.indices.getAlias({ name: aliasName }, { signal });
  if (!alias) {
    logger.debug(`Alias ${aliasName} does not exist, skipping rollover`);
    return false;
  }

  const response = await esClient.indices.rollover(
    {
      alias: aliasName,
      dry_run: true,
      conditions: {
        max_age: conditions.maxAge,
        max_primary_shard_size: conditions.maxPrimaryShardSize,
      },
    },
    { signal }
  );

  const conditionsMet = Object.entries(response.conditions)
    .filter(([key, value]) => value)
    .map(([key, value]) => ({
      condition: key,
      isMet: value,
    }));

  if (conditionsMet.length) {
    if (await esClient.indices.exists({ index: response.new_index }, { signal })) {
      return false;
    }

    await esClient.indices.create({
      index: response.new_index,
      mappings: WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
    });
    await esClient.indices.updateAliases({
      actions: [
        { add: { index: response.new_index, alias: aliasName, is_write_index: true } },
        { add: { index: response.old_index, alias: aliasName, is_write_index: false } },
      ],
    });
    logger.debug(
      `Rolled over alias ${aliasName} to ${response.new_index}. Conditions met: ${conditionsMet
        .map(({ condition, isMet }) => `${condition}: ${isMet}`)
        .join(', ')}`
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

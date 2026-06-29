/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { errors as EsErrors } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { DataStreamsStart } from '@kbn/core-data-streams-server';
import {
  WORKFLOWS_EXECUTIONS_INDEX,
  WORKFLOWS_STEP_EXECUTIONS_INDEX,
} from '@kbn/workflows';
import { initializeStepExecutionsClient } from '../../repositories/step_executions_data_stream';
import { initializeWorkflowExecutionsClient } from '../../repositories/workflow_executions_data_stream';

let ensureReadyPromise: Promise<void> | undefined;

const isNotFoundError = (error: unknown): boolean =>
  error instanceof EsErrors.ResponseError && error.statusCode === 404;

const verifyOrCreateDataStream = async (
  esClient: ElasticsearchClient,
  streamName: string
): Promise<void> => {
  try {
    await esClient.indices.getDataStream({ name: streamName });
    return;
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error;
    }
  }

  try {
    await esClient.indices.createDataStream({ name: streamName });
  } catch (error) {
    if (
      error instanceof EsErrors.ResponseError &&
      error.statusCode === 400 &&
      error.body?.error.type === 'resource_already_exists_exception'
    ) {
      return;
    }
    throw error;
  }
};

/**
 * Registers index templates (via core data streams) and ensures both execution
 * data streams exist before reads/writes against `.workflows-executions` or
 * `.workflows-step-executions`.
 */
export const ensureExecutionDataStreamsReady = async (
  dataStreams: DataStreamsStart,
  esClient: ElasticsearchClient
): Promise<void> => {
  if (!ensureReadyPromise) {
    ensureReadyPromise = (async () => {
      await Promise.all([
        initializeWorkflowExecutionsClient(dataStreams),
        initializeStepExecutionsClient(dataStreams),
      ]);
      await Promise.all([
        verifyOrCreateDataStream(esClient, WORKFLOWS_EXECUTIONS_INDEX),
        verifyOrCreateDataStream(esClient, WORKFLOWS_STEP_EXECUTIONS_INDEX),
      ]);
    })().catch((error) => {
      ensureReadyPromise = undefined;
      throw error;
    });
  }

  await ensureReadyPromise;
};

/** @internal */
export const resetEnsureExecutionDataStreamsReadyForTests = (): void => {
  ensureReadyPromise = undefined;
};

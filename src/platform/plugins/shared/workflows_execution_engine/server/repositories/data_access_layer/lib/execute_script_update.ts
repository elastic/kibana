/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

import type { ScriptUpdateRequest, ScriptUpdateResponse, ScriptUpdateResult } from '../types';
import { retryTransientEsErrors } from '../../../lib/retry_transient_es_errors';

export interface ExecuteScriptUpdateParams {
  esClient: ElasticsearchClient;
  indexName: string;
  request: ScriptUpdateRequest;
  logger: Logger;
}

const isScriptUpdateNotFoundError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const err = error as {
    statusCode?: number;
    meta?: { statusCode?: number; body?: { result?: string } };
    body?: { result?: string };
  };

  return (
    err.statusCode === 404 ||
    err.meta?.statusCode === 404 ||
    err.meta?.body?.result === 'not_found' ||
    err.body?.result === 'not_found'
  );
};

const mapScriptUpdateResult = (result: string | undefined): ScriptUpdateResult => {
  if (result === 'noop' || result === 'not_found' || result === 'updated') {
    return result;
  }

  return 'updated';
};

export const executeScriptUpdate = async ({
  esClient,
  indexName,
  request,
  logger,
}: ExecuteScriptUpdateParams): Promise<ScriptUpdateResponse> => {
  try {
    const response = await retryTransientEsErrors(
      () =>
        esClient.update({
          index: indexName,
          id: request.id,
          script: {
            source: request.script,
            lang: 'painless',
            params: request.params,
          },
          ...(request.retryOnConflict !== undefined
            ? { retry_on_conflict: request.retryOnConflict }
            : {}),
          ...(request.refresh !== undefined ? { refresh: request.refresh } : {}),
        }),
      { logger }
    );

    return {
      result: mapScriptUpdateResult(response.result),
    };
  } catch (error) {
    if (isScriptUpdateNotFoundError(error)) {
      return { result: 'not_found' };
    }
    throw error;
  }
};

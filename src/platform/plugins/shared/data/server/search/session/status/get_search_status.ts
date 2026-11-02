/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import moment from 'moment';
import {
  ESQL_ASYNC_SEARCH_STRATEGY,
  type SearchSessionRequestInfo,
  type SearchSessionRequestStatus,
} from '../../../../common';
import { SearchStatus } from '../types';

function requestByStrategy({
  search,
  asyncId,
  esClient,
}: {
  search: SearchSessionRequestInfo;
  asyncId: string;
  esClient: ElasticsearchClient;
}) {
  if (search.strategy === ESQL_ASYNC_SEARCH_STRATEGY) {
    return esClient.esql.asyncQueryGet({ id: asyncId }, { meta: true });
  }

  return esClient.asyncSearch.status(
    {
      id: asyncId,
    },
    { meta: true }
  );
}

export async function getSearchStatus({
  search,
  asyncId,
  esClient,
}: {
  search: SearchSessionRequestInfo;
  asyncId: string;
  esClient: ElasticsearchClient;
}): Promise<SearchSessionRequestStatus> {
  // TODO: Handle strategies other than the default one
  // https://github.com/elastic/kibana/issues/127880
  const isFinished = !!search.status && search.status !== SearchStatus.IN_PROGRESS;
  try {
    if (isFinished) {
      return {
        status: search.status!,
        startedAt: search.startedAt,
        completedAt: search.completedAt,
        error: search.error,
      };
    }

    const apiResponse = await requestByStrategy({
      search,
      asyncId,
      esClient,
    });

    const response = apiResponse.body;
    const startedAt =
      'start_time_in_millis' in response
        ? moment(response.start_time_in_millis).toISOString()
        : undefined;
    const completedAt =
      'completion_time_in_millis' in response && response.completion_time_in_millis
        ? moment(response.completion_time_in_millis).toISOString()
        : undefined;

    if ('completion_status' in response && response.completion_status! >= 400) {
      return {
        status: SearchStatus.ERROR,
        startedAt,
        completedAt,
        error: {
          code: response.completion_status!,
        },
      };
    }

    if (!response.is_running) {
      return {
        status: SearchStatus.COMPLETE,
        startedAt,
        completedAt,
      };
    }

    return {
      status: SearchStatus.IN_PROGRESS,
      startedAt,
    };
  } catch (e) {
    return {
      status: SearchStatus.ERROR,
      error: {
        code: e.statusCode || 500,
        message: e.message,
      },
    };
  }
}

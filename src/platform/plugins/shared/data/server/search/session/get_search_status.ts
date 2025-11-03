/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { SearchSessionRequestInfo, SearchSessionRequestStatus } from '../../../common';
import { SearchStatus } from './types';

function requestByStrategy({
  session,
  asyncId,
  esClient,
}: {
  session: SearchSessionRequestInfo;
  asyncId: string;
  esClient: ElasticsearchClient;
}) {
  if (session.strategy === 'esql_async') {
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
  session,
  asyncId,
  esClient,
}: {
  session: SearchSessionRequestInfo;
  asyncId: string;
  esClient: ElasticsearchClient;
}): Promise<SearchSessionRequestStatus> {
  // TODO: Handle strategies other than the default one
  // https://github.com/elastic/kibana/issues/127880
  try {
    const apiResponse = await requestByStrategy({
      session,
      asyncId,
      esClient,
    });

    const response = apiResponse.body;
    if ('completion_status' in response && response.completion_status! >= 400) {
      return {
        status: SearchStatus.ERROR,
        error: i18n.translate('data.search.statusError', {
          defaultMessage: `Search {searchId} completed with a {errorCode} status`,
          values: { searchId: asyncId, errorCode: response.completion_status },
        }),
      };
    } else if (!response.is_running) {
      return {
        status: SearchStatus.COMPLETE,
        error: undefined,
      };
    } else {
      return {
        status: SearchStatus.IN_PROGRESS,
        error: undefined,
      };
    }
  } catch (e) {
    return {
      status: SearchStatus.ERROR,
      error: i18n.translate('data.search.statusThrow', {
        defaultMessage: `Search status for search with id {searchId} threw an error {message} (statusCode: {errorCode})`,
        values: {
          message: e.message,
          errorCode: e.statusCode || 500,
          searchId: asyncId,
        },
      }),
    };
  }
}

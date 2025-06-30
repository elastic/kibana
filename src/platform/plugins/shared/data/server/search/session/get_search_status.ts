/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { EsqlAsyncEsqlResult } from '@elastic/elasticsearch/lib/api/types';

import type { TransportResult } from '@elastic/elasticsearch';
import { ElasticsearchClient } from '@kbn/core/server';
import { SearchSessionRequestInfo, SearchSessionRequestStatus } from '../../../common';
import { SearchStatus } from './types';
import { AsyncSearchStatusResponse } from '../..';

export async function getSearchStatus(
  internalClient: ElasticsearchClient,
  asyncId: string,
  session: SearchSessionRequestInfo
): Promise<SearchSessionRequestStatus> {
  // console.log('getSearchStatus', asyncId, session);

  try {
    const apiResponse: EsqlAsyncEsqlResult | TransportResult<AsyncSearchStatusResponse, unknown> =
      session.strategy === 'esql_async'
        ? await internalClient.esql.asyncQueryGet({ id: asyncId })
        : await internalClient.asyncSearch.status(
            {
              id: asyncId,
            },
            { meta: true }
          );
    // @ts-ignore
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
    // console.error(e);
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

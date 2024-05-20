/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { TransportResult } from '@elastic/elasticsearch';
import { ElasticsearchClient } from '@kbn/core/server';
import { SearchSessionRequestStatus } from '../../../common';
import { SearchStatus } from './types';
import { AsyncSearchStatusResponse } from '../..';

export async function getSearchStatus(
  internalClient: ElasticsearchClient,
  asyncId: string
): Promise<SearchSessionRequestStatus> {
  // TODO: Handle strategies other than the default one
  // https://github.com/elastic/kibana/issues/127880
  try {
    const apiResponse: TransportResult<AsyncSearchStatusResponse> =
      await internalClient.asyncSearch.status(
        {
          id: asyncId,
        },
        { meta: true }
      );
    const response = apiResponse.body;
    if (response.completion_status! >= 400) {
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

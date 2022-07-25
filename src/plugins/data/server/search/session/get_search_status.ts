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
import { SearchSessionRequestInfo } from '../../../common';
import { AsyncSearchStatusResponse } from '../..';
import { SearchStatus } from './types';

export async function getSearchStatus(
  client: ElasticsearchClient,
  asyncId: string
): Promise<Pick<SearchSessionRequestInfo, 'status' | 'error'>> {
  // TODO: Handle strategies other than the default one
  // https://github.com/elastic/kibana/issues/127880
  try {
    // @ts-expect-error start_time_in_millis: EpochMillis is string | number
    const apiResponse: TransportResult<AsyncSearchStatusResponse> = await client.asyncSearch.status(
      {
        id: asyncId,
      },
      { meta: true }
    );
    const response = apiResponse.body;
    if ((response.is_partial && !response.is_running) || response.completion_status >= 400) {
      return {
        status: SearchStatus.ERROR,
        error: i18n.translate('data.search.statusError', {
          defaultMessage: `Search completed with a {errorCode} status`,
          values: { errorCode: response.completion_status },
        }),
      };
    } else if (!response.is_partial && !response.is_running) {
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
        defaultMessage: `Search status threw an error {message} ({errorCode}) status`,
        values: {
          message: e.message,
          errorCode: e.statusCode || 500,
        },
      }),
    };
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { estypes } from '@elastic/elasticsearch';
import { i18n } from '@kbn/i18n';
import { SearchResponseWarning } from '../../../common/search/types';

/**
 * @public
 */
export interface SearchResponseWarnings {
  timedOut?: SearchResponseWarning;
  shardFailures?: SearchResponseWarning;
  /**
   * Fields from the response that are needed for logic to handle warnings on a case-by-case basis
   */
  rawResponse?: estypes.SearchResponse;
}

/**
 * @internal
 */
export function extractWarnings(
  rawResponse: estypes.SearchResponse | undefined
): SearchResponseWarnings {
  if (!rawResponse) {
    return { rawResponse };
  }

  const timedOut: SearchResponseWarning | undefined = rawResponse.timed_out
    ? {
        title: i18n.translate('data.search.searchSource.fetch.requestTimedOutNotificationMessage', {
          defaultMessage: 'Data might be incomplete because your request timed out',
        }),
      }
    : undefined;

  const shardFailures: SearchResponseWarning | undefined =
    rawResponse._shards && rawResponse._shards.failed
      ? {
          title: i18n.translate('data.search.searchSource.fetch.shardsFailedNotificationMessage', {
            defaultMessage: '{shardsFailed} of {shardsTotal} shards failed',
            values: {
              shardsFailed: rawResponse._shards.failed,
              shardsTotal: rawResponse._shards.total,
            },
          }),
          text: i18n.translate(
            'data.search.searchSource.fetch.shardsFailedNotificationDescription',
            {
              defaultMessage: 'The data you are seeing might be incomplete or wrong.',
            }
          ),
        }
      : undefined;

  return { timedOut, shardFailures, rawResponse };
}

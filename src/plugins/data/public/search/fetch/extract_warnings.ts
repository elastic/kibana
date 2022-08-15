/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { IKibanaSearchResponse, SearchResponseWarning } from '../../../common/search/types';

export interface SearchResponseWarnings {
  timedOut?: SearchResponseWarning;
  shardFailures?: SearchResponseWarning;
}

export function extractWarnings(
  rawResponse: IKibanaSearchResponse['rawResponse']
): SearchResponseWarnings {
  let timedOut: SearchResponseWarning | undefined;
  if (rawResponse.timed_out) {
    timedOut = {
      title: i18n.translate('data.search.searchSource.fetch.requestTimedOutNotificationMessage', {
        defaultMessage: 'Data might be incomplete because your request timed out',
      }),
    };
  }

  let shardFailures: SearchResponseWarning | undefined;
  if (rawResponse._shards && rawResponse._shards.failed) {
    shardFailures = {
      title: i18n.translate('data.search.searchSource.fetch.shardsFailedNotificationMessage', {
        defaultMessage: '{shardsFailed} of {shardsTotal} shards failed',
        values: {
          shardsFailed: rawResponse._shards.failed,
          shardsTotal: rawResponse._shards.total,
        },
      }),
      text: i18n.translate('data.search.searchSource.fetch.shardsFailedNotificationDescription', {
        defaultMessage: 'The data you are seeing might be incomplete or wrong.',
      }),
    };
  }

  return { timedOut, shardFailures };
}

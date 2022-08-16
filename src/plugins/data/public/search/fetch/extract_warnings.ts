/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { estypes } from '@elastic/elasticsearch';
import { i18n } from '@kbn/i18n';

/**
 * The format of warning notifications sourced from info in a search response body
 */
export interface SearchResponseWarningNotification {
  /**
   * Title for the heading of the warning toast notification
   */
  title?: string;
  /**
   * Text for the body of the warning toast notification
   */
  text?: string;
}

/**
 * The format of warning data which may be preset in search response body (shard failures, timeouts).
 * @public
 */
export interface SearchResponseWarnings {
  notifications?: {
    timedOut?: SearchResponseWarningNotification;
    shardFailures?: SearchResponseWarningNotification;
  };
  types?: string[]; // shard stats can have multiple shard failure reasons, such as "illegal_argument_exception", etc
  shardStats?: estypes.ShardStatistics;
  timedOut?: boolean;
}

/**
 * @internal
 */
export function extractWarnings(
  rawResponse: estypes.SearchResponse | undefined
): SearchResponseWarnings | undefined {
  if (!rawResponse) {
    return;
  }

  let timedOut: SearchResponseWarningNotification | undefined;
  if (rawResponse.timed_out === true) {
    timedOut = {
      title: i18n.translate('data.search.searchSource.fetch.requestTimedOutNotificationMessage', {
        defaultMessage: 'Data might be incomplete because your request timed out',
      }),
    };
  }

  let shardFailures: SearchResponseWarningNotification | undefined;
  let types: string[] | undefined;
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

    types = rawResponse._shards.failures?.map((f) => f.reason.type);
  }

  const shardStats = timedOut || shardFailures ? rawResponse._shards : undefined;

  return {
    types,
    shardStats,
    timedOut: rawResponse.timed_out,
    notifications: {
      timedOut,
      shardFailures,
    },
  };
}

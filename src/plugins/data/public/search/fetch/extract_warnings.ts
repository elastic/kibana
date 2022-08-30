/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { estypes } from '@elastic/elasticsearch';
import { i18n } from '@kbn/i18n';
import { SearchResponseWarning } from '../types';

/**
 * @internal
 */
export function extractWarnings(rawResponse: estypes.SearchResponse): SearchResponseWarning[] {
  const warnings: SearchResponseWarning[] = [];

  if (rawResponse.timed_out === true) {
    warnings.push({
      type: 'timed_out',
      message: i18n.translate('data.search.searchSource.fetch.requestTimedOutNotificationMessage', {
        defaultMessage: 'Data might be incomplete because your request timed out',
      }),
      reason: undefined, // exists so that callers do not have to cast when working with shard warnings.
    });
  }

  if (rawResponse._shards && rawResponse._shards.failed) {
    const message = i18n.translate(
      'data.search.searchSource.fetch.shardsFailedNotificationMessage',
      {
        defaultMessage: '{shardsFailed} of {shardsTotal} shards failed',
        values: {
          shardsFailed: rawResponse._shards.failed,
          shardsTotal: rawResponse._shards.total,
        },
      }
    );
    const text = i18n.translate(
      'data.search.searchSource.fetch.shardsFailedNotificationDescription',
      { defaultMessage: 'The data you are seeing might be incomplete or wrong.' }
    );

    if (rawResponse._shards.failures) {
      rawResponse._shards.failures?.forEach((f) => {
        warnings.push({
          type: 'shard_failure',
          message,
          text,
          reason: {
            type: f.reason.type,
            reason: f.reason.reason,
          },
        });
      });
    } else {
      // unknown type and reason
      warnings.push({
        type: 'shard_failure',
        message,
        text,
        reason: { type: 'generic_shard_warning' },
      });
    }
  }

  return warnings;
}

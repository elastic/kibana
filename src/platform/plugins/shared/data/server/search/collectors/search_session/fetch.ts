/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Logger } from '@kbn/core/server';
import { CollectorFetchContext } from '@kbn/usage-collection-plugin/server';
import { ReportedUsage } from './register';
import { SEARCH_SESSION_TYPE } from '../../../../common';

interface SessionPersistedTermsBucket {
  key_as_string: 'false' | 'true';
  doc_count: number;
}

export function fetchProvider(getIndexForType: (type: string) => Promise<string>, logger: Logger) {
  return async ({ esClient }: CollectorFetchContext): Promise<ReportedUsage> => {
    try {
      const searchSessionIndex = await getIndexForType(SEARCH_SESSION_TYPE);
      const esResponse = await esClient.search<unknown>({
        index: searchSessionIndex,
        body: {
          size: 0,
          aggs: {
            persisted: {
              terms: {
                field: `${SEARCH_SESSION_TYPE}.persisted`,
              },
            },
          },
        },
      });

      const aggs = esResponse.aggregations as Record<
        string,
        estypes.AggregationsMultiBucketAggregateBase<SessionPersistedTermsBucket>
      >;

      const buckets = aggs.persisted.buckets as SessionPersistedTermsBucket[];
      if (!buckets.length) {
        return { transientCount: 0, persistedCount: 0, totalCount: 0 };
      }

      const { transientCount = 0, persistedCount = 0 } = buckets.reduce(
        (usage: Partial<ReportedUsage>, bucket: SessionPersistedTermsBucket) => {
          const key = bucket.key_as_string === 'false' ? 'transientCount' : 'persistedCount';
          usage[key] = bucket.doc_count;
          return usage;
        },
        {}
      );
      const totalCount = transientCount + persistedCount;
      logger.debug(`fetchProvider | ${persistedCount} persisted | ${transientCount} transient`);
      return { transientCount, persistedCount, totalCount };
    } catch (e) {
      logger.warn(`fetchProvider | error | ${e.message}`);
      return { transientCount: 0, persistedCount: 0, totalCount: 0 };
    }
  };
}

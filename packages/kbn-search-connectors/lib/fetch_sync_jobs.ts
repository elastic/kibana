/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import { CONNECTORS_JOBS_INDEX } from '..';
import { ConnectorSyncJob, SyncJobType } from '../types/connectors';
import { Paginate } from '../types/pagination';
import { isNotNullish } from '../utils/is_not_nullish';

import { fetchWithPagination } from '../utils/fetch_with_pagination';
import { isIndexNotFoundException } from '../utils/identify_exceptions';

const defaultResult: Paginate<ConnectorSyncJob> = {
  _meta: {
    page: {
      from: 0,
      has_more_hits_than_total: false,
      size: 10,
      total: 0,
    },
  },
  data: [],
};

export const fetchSyncJobsByConnectorId = async (
  client: ElasticsearchClient,
  connectorId: string,
  from: number,
  size: number,
  syncJobType: 'content' | 'access_control' | 'all' = 'all'
): Promise<Paginate<ConnectorSyncJob>> => {
  try {
    const query =
      syncJobType === 'all'
        ? {
            term: {
              'connector.id': connectorId,
            },
          }
        : {
            bool: {
              filter: [
                {
                  term: {
                    'connector.id': connectorId,
                  },
                },
                {
                  terms: {
                    job_type:
                      syncJobType === 'content'
                        ? [SyncJobType.FULL, SyncJobType.INCREMENTAL]
                        : [SyncJobType.ACCESS_CONTROL],
                  },
                },
              ],
            },
          };
    const result = await fetchWithPagination(
      async () =>
        await client.search<ConnectorSyncJob>({
          from,
          index: CONNECTORS_JOBS_INDEX,
          query,
          size,
          sort: { created_at: { order: 'desc' } },
        }),
      from,
      size
    );
    return {
      ...result,
      data: result.data
        .map((hit) => (hit._source ? { ...hit._source, id: hit._id } : null))
        .filter(isNotNullish),
    };
  } catch (error) {
    if (isIndexNotFoundException(error)) {
      return defaultResult;
    }
    throw error;
  }
};

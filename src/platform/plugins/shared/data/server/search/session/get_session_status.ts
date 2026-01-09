/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { SearchSessionSavedObjectAttributes } from '../../../common';
import { SearchSessionStatus } from '../../../common';
import { SearchStatus } from './types';
import type { SearchSessionsConfigSchema } from '../../config';
import { getSearchStatus } from './get_search_status';

// A session should is considered "new" for the first 30 seconds after creation. We need some arbitrary value here
// because if a sessions stays for too long with no searches assigned to it something happened and we should mark it as error.
// Some examples of possible issues: the browser is closed or in another tab the search requests are canceled.
const NEW_SESSION_THRESHOLD_SECONDS = 30;

export async function getSessionStatus(
  deps: { esClient: ElasticsearchClient },
  session: SearchSessionSavedObjectAttributes,
  config: SearchSessionsConfigSchema
): Promise<{ status: SearchSessionStatus; errors?: string[] }> {
  if (session.isCanceled === true) {
    return { status: SearchSessionStatus.CANCELLED };
  }

  const now = moment();

  if (moment(session.expires).isBefore(now)) {
    return { status: SearchSessionStatus.EXPIRED };
  }

  const searches = Object.values(session.idMapping);

  const secondsSinceCreated = moment().diff(moment(session.created), 'seconds');
  const isOldSession = secondsSinceCreated > NEW_SESSION_THRESHOLD_SECONDS;
  if (searches.length === 0 && isOldSession) {
    return { status: SearchSessionStatus.ERROR };
  }

  const searchStatuses = await Promise.all(
    searches.map(async (s) => {
      const status = await getSearchStatus({
        asyncId: s.id,
        session: s,
        esClient: deps.esClient,
      });
      return {
        ...s,
        ...status,
      };
    })
  );

  if (searchStatuses.some((item) => item.status === SearchStatus.ERROR)) {
    const erroredSearches = searchStatuses.filter((s) => s.status === SearchStatus.ERROR);
    const errors = erroredSearches.map((s) => s.error).filter((error) => !!error) as string[];
    return { status: SearchSessionStatus.ERROR, errors };
  } else if (
    searchStatuses.length > 0 &&
    searchStatuses.every((item) => item.status === SearchStatus.COMPLETE)
  ) {
    return { status: SearchSessionStatus.COMPLETE };
  } else {
    return { status: SearchSessionStatus.IN_PROGRESS };
  }
}

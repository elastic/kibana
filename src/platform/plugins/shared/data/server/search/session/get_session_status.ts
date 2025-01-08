/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import { ElasticsearchClient } from '@kbn/core/server';
import { SearchSessionSavedObjectAttributes, SearchSessionStatus } from '../../../common';
import { SearchStatus } from './types';
import { SearchSessionsConfigSchema } from '../../config';
import { getSearchStatus } from './get_search_status';

export async function getSessionStatus(
  deps: { internalClient: ElasticsearchClient },
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
  const searchStatuses = await Promise.all(
    searches.map(async (s) => {
      const status = await getSearchStatus(deps.internalClient, s.id);
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

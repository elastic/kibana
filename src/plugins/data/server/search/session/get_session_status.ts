/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import { ElasticsearchClient } from '@kbn/core/server';
import { SearchSessionSavedObjectAttributes, SearchSessionStatus } from '../../../common';
import { SearchStatus } from './types';
import { SearchSessionsConfigSchema } from '../../../config';
import { getSearchStatus } from './get_search_status';

export async function getSessionStatus(
  deps: { internalClient: ElasticsearchClient },
  session: SearchSessionSavedObjectAttributes,
  config: SearchSessionsConfigSchema
): Promise<SearchSessionStatus> {
  if (session.isCanceled === true) {
    return SearchSessionStatus.CANCELLED;
  }

  const now = moment();

  if (moment(session.expires).isBefore(now)) {
    return SearchSessionStatus.EXPIRED;
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
    return SearchSessionStatus.ERROR;
  } else if (
    searchStatuses.length > 0 &&
    searchStatuses.every((item) => item.status === SearchStatus.COMPLETE)
  ) {
    return SearchSessionStatus.COMPLETE;
  } else {
    return SearchSessionStatus.IN_PROGRESS;
  }
}

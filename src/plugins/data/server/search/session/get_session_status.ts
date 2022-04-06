/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import {
  SearchSessionSavedObjectAttributes,
  SearchSessionStatus,
} from '../../../../../../src/plugins/data/common/';
import { SearchStatus } from './types';
import { SearchSessionsConfigSchema } from '../../../config';

export function getSessionStatus(
  session: SearchSessionSavedObjectAttributes,
  config: SearchSessionsConfigSchema
): SearchSessionStatus {
  const searchStatuses = Object.values(session.idMapping);
  const curTime = moment();
  if (searchStatuses.some((item) => item.status === SearchStatus.ERROR)) {
    return SearchSessionStatus.ERROR;
  } else if (
    searchStatuses.length === 0 &&
    curTime.diff(moment(session.touched), 'ms') >
      moment.duration(config.notTouchedInProgressTimeout).asMilliseconds()
  ) {
    // Expire empty sessions that weren't touched for a minute
    return SearchSessionStatus.EXPIRED;
  } else if (
    searchStatuses.length > 0 &&
    searchStatuses.every((item) => item.status === SearchStatus.COMPLETE)
  ) {
    return SearchSessionStatus.COMPLETE;
  } else {
    return SearchSessionStatus.IN_PROGRESS;
  }
}

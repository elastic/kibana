/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import { ConnectorSyncJob } from '../types';

export function getSyncJobDuration(syncJob: ConnectorSyncJob): moment.Duration | undefined {
  return syncJob.started_at
    ? moment.duration(moment(syncJob.completed_at || new Date()).diff(moment(syncJob.started_at)))
    : undefined;
}

export function durationToText(input?: moment.Duration): string {
  if (input) {
    const hours = input.hours();
    const minutes = input.minutes();
    const seconds = input.seconds();
    return `${hours}h ${minutes}m ${seconds}s`;
  } else {
    return '--';
  }
}

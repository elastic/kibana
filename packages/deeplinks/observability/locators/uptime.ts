/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { SerializableRecord } from '@kbn/utility-types';

export const uptimeOverviewLocatorID = 'UPTIME_OVERVIEW_LOCATOR';

export interface UptimeOverviewLocatorInfraParams extends SerializableRecord {
  ip?: string;
  host?: string;
  container?: string;
  pod?: string;
}

export interface UptimeOverviewLocatorParams extends SerializableRecord {
  dateRangeStart?: string;
  dateRangeEnd?: string;
  search?: string;
}

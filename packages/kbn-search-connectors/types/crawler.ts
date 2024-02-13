/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
export enum CrawlerStatus {
  Pending = 'pending',
  Suspended = 'suspended',
  Starting = 'starting',
  Running = 'running',
  Suspending = 'suspending',
  Canceling = 'canceling',
  Success = 'success',
  Failed = 'failed',
  Canceled = 'canceled',
  Skipped = 'skipped',
}

export interface Crawler {
  id: string;
  index_name: string;
  most_recent_crawl_request_status?: CrawlerStatus;
}

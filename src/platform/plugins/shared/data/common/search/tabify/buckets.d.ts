/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IAggConfig } from '../aggs';
import type { TimeRangeInformation } from './types';
export declare class TabifyBuckets {
  length: number;
  objectMode: boolean;
  buckets: any;
  _keys: any[];
  constructor(aggResp: any, agg?: IAggConfig, timeRange?: TimeRangeInformation);
  forEach(fn: (bucket: any, key: any) => void): void;
  private orderBucketsAccordingToParams;
  private dropPartials;
}

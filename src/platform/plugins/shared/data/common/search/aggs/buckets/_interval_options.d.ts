/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IBucketAggConfig } from './bucket_agg_type';
export declare const autoInterval = 'auto';
export declare const isAutoInterval: (value: unknown) => value is 'auto';
export declare const intervalOptions: (
  | {
      display: string;
      val: string;
      enabled(agg: IBucketAggConfig): boolean;
    }
  | {
      enabled?: undefined;
      display: string;
      val: string;
    }
)[];

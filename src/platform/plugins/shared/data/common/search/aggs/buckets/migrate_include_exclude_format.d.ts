/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IBucketAggConfig, BucketAggParam } from './bucket_agg_type';
import type { IAggConfig } from '../agg_config';
export declare const isType: (...types: string[]) => (agg: IAggConfig) => boolean;
export declare const isNumberType: (agg: IAggConfig) => boolean;
export declare const isStringType: (agg: IAggConfig) => boolean;
export declare const isStringOrNumberType: (agg: IAggConfig) => boolean;
export declare const migrateIncludeExcludeFormat: Partial<BucketAggParam<IBucketAggConfig>>;

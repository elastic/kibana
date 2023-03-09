/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// copied from common/search_strategy/common
export interface GenericBuckets {
  key: string | string[];
  key_as_string?: string; // contains, for example, formatted dates
  doc_count: number;
}

export const NONE_GROUP_KEY = 'none';

export type RawBucket<T> = GenericBuckets & T;

/** Defines the shape of the aggregation returned by Elasticsearch */
// TODO: write developer docs for these fields
export interface GroupingAggregation<T> {
  stackByMultipleFields0?: {
    buckets?: Array<RawBucket<T>>;
  };
  groupCount0?: {
    value?: number | null;
  };
  unitCount0?: {
    value?: number | null;
  };
}

export type GroupingFieldTotalAggregation = Record<
  string,
  { value?: number | null; buckets?: Array<{ doc_count?: number | null }> }
>;

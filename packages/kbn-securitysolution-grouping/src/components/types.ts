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

export type RawBucket = GenericBuckets & {
  alertsCount?: {
    value?: number | null; // Elasticsearch returns `null` when a sub-aggregation cannot be computed
  };
  severitiesSubAggregation?: {
    buckets?: GenericBuckets[];
  };
  countSeveritySubAggregation?: {
    value?: number | null; // Elasticsearch returns `null` when a sub-aggregation cannot be computed
  };
  usersCountAggregation?: {
    value?: number | null; // Elasticsearch returns `null` when a sub-aggregation cannot be computed
  };
  hostsCountAggregation?: {
    value?: number | null; // Elasticsearch returns `null` when a sub-aggregation cannot be computed
  };
  rulesCountAggregation?: {
    value?: number | null; // Elasticsearch returns `null` when a sub-aggregation cannot be computed
  };
  ruleTags?: {
    doc_count_error_upper_bound?: number;
    sum_other_doc_count?: number;
    buckets?: GenericBuckets[];
  };
  stackByMultipleFields1?: {
    buckets?: GenericBuckets[];
    doc_count_error_upper_bound?: number;
    sum_other_doc_count?: number;
  };
};

/** Defines the shape of the aggregation returned by Elasticsearch */
export interface GroupingAggregation {
  stackByMultipleFields0?: {
    buckets?: RawBucket[];
  };
  groupsCount0?: {
    value?: number | null;
  };
}

export type GroupingFieldTotalAggregation = Record<
  string,
  { value?: number | null; buckets?: Array<{ doc_count?: number | null }> }
>;

export type FlattenedBucket = Pick<
  RawBucket,
  'doc_count' | 'key' | 'key_as_string' | 'alertsCount'
> & {
  stackByMultipleFields1Key?: string;
  stackByMultipleFields1DocCount?: number;
};

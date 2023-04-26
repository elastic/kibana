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
  groupByFields?: {
    buckets?: Array<RawBucket<T>>;
  };
  groupsCount?: {
    value?: number | null;
  };
  unitsCount?: {
    value?: number | null;
  };
}

export type GroupingFieldTotalAggregation<T> = Record<
  string,
  {
    value?: number | null;
    buckets?: Array<RawBucket<T>>;
  }
>;

export interface BadgeMetric {
  value: number;
  color?: string;
  width?: number;
}

export interface StatRenderer {
  title: string;
  renderer?: JSX.Element;
  badge?: BadgeMetric;
}

export type GroupStatsRenderer<T> = (
  selectedGroup: string,
  fieldBucket: RawBucket<T>
) => StatRenderer[];

export type GroupPanelRenderer<T> = (
  selectedGroup: string,
  fieldBucket: RawBucket<T>
) => JSX.Element | undefined;

export type OnGroupToggle = (params: {
  isOpen: boolean;
  groupName?: string | undefined;
  groupNumber: number;
  groupingId: string;
}) => void;

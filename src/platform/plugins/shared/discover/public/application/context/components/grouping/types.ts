/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpSetup, NotificationsStart } from '@kbn/core/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { Filter } from '@kbn/es-query';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public';
import type { GroupingProps, GroupOption } from '@kbn/grouping/src';
import type { ReactElement } from 'react';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DiscoverStateContainer } from '../../../main/state_management/discover_state';

export interface BucketItem {
  key: string;
  doc_count: number;
}

export interface DataByGroupingAgg extends Record<string, unknown> {
  groupByFields: {
    doc_count_error_upper_bound: number;
    sum_other_doc_count: number;
    buckets: BucketItem[];
  };
  docsCountAggregation?: {
    value: number;
  };
  sourceCountAggregation?: {
    value: number;
  };
  groupsCount: {
    value: number;
  };
  unitsCount: {
    value: number;
  };
}

export interface GroupModel {
  activeGroups: string[];
  options?: Array<{ key: string; label: string }>;
}

export interface DataGroupingState {
  [groupingId: string]: GroupModel;
}

export interface DataGroupingProps<
  T extends BaseDataGroupAggregations = BaseDataGroupAggregations
> {
  /**
   * The leaf component that will be rendered in the grouping panels
   */
  children: (groupingFilters: Filter[]) => ReactElement;
  /**
   * Default search filters
   */
  defaultFilters?: Filter[];
  /**
   * Items that will be rendered in the `Take Actions` menu
   */
  takeActionItems?: GroupingProps<T>['takeActionItems'];
  /**
   * The default fields available for grouping
   */
  defaultGroupingOptions: GroupOption[];
  /**
   * External loading state
   */
  loading?: boolean;
  /**
   * ID used to retrieve the current grouping configuration from the state
   */
  groupingId: string;
  /**
   * Services required for the grouping component
   */
  services: {
    notifications: NotificationsStart;
    dataViews?: DataViewsServicePublic;
    http: HttpSetup;
    data: DataPublicPluginStart;
  };
  dataView: DataView;
  stateContainer: DiscoverStateContainer;
  onGroupClose: () => void;
}

export interface DataGroupAggregationBucket {
  key: string;
  doc_count: number;
  isNullGroup?: boolean;
  unitsCount?: {
    value: number;
  };
}

export interface BaseDataGroupAggregations {
  groupByFields: {
    doc_count_error_upper_bound: number;
    sum_other_doc_count: number;
    buckets: DataGroupAggregationBucket[];
  };
  groupsCount: {
    value: number;
  };
  unitsCount: {
    value: number;
  };
}

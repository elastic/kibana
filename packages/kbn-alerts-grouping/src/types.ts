/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter, Query } from '@kbn/es-query';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import type { HttpSetup } from '@kbn/core-http-browser';
import {
  GroupingProps,
  GroupOption,
  GroupPanelRenderer,
  GetGroupStats,
  NamedAggregation,
} from '@kbn/grouping/src';
import { ReactElement } from 'react';

export interface GroupModel {
  activeGroups: string[];
  options?: Array<{ key: string; label: string }>;
}

export interface AlertsGroupingState {
  [groupingId: string]: GroupModel;
}

export interface AlertsGroupingProps<
  T extends BaseAlertsGroupAggregations = BaseAlertsGroupAggregations
> {
  /**
   * The leaf component that will be rendered in the grouping panels
   */
  children: (groupingFilters: Filter[]) => ReactElement;
  /**
   * Render function for the group panel header
   */
  renderGroupPanel?: GroupPanelRenderer<T>;
  /**
   * A function that given the current grouping field and aggregation results, returns an array of
   * stat items to be rendered in the group panel
   */
  getGroupStats?: GetGroupStats<T>;
  /**
   * Default search filters
   */
  defaultFilters?: Filter[];
  /**
   * Global search filters
   */
  globalFilters: Filter[];
  /**
   * Items that will be rendered in the `Take Actions` menu
   */
  takeActionItems?: GroupingProps<T>['takeActionItems'];
  /**
   * The default fields available for grouping
   */
  defaultGroupingOptions: GroupOption[];
  /**
   * The alerting rule type ids this grouping covers
   */
  ruleTypeIds: string[];
  /**
   * The alerting consumers this grouping covers
   */
  consumers?: string[];
  /**
   * Time filter start
   */
  from: string;
  /**
   * Time filter end
   */
  to: string;
  /**
   * Global search query (i.e. from the KQL bar)
   */
  globalQuery: Query;
  /**
   * External loading state
   */
  loading?: boolean;
  /**
   * ID used to retrieve the current grouping configuration from the state
   */
  groupingId: string;
  /**
   * Resolves an array of aggregations for a given grouping field
   */
  getAggregationsByGroupingField: (field: string) => NamedAggregation[];
  /**
   * Services required for the grouping component
   */
  services: {
    notifications: NotificationsStart;
    dataViews: DataViewsServicePublic;
    http: HttpSetup;
  };
}

export interface AlertsGroupAggregationBucket {
  key: string;
  doc_count: number;
  isNullGroup?: boolean;
  unitsCount?: {
    value: number;
  };
}

export interface BaseAlertsGroupAggregations {
  groupByFields: {
    doc_count_error_upper_bound: number;
    sum_other_doc_count: number;
    buckets: AlertsGroupAggregationBucket[];
  };
  groupsCount: {
    value: number;
  };
  unitsCount: {
    value: number;
  };
}

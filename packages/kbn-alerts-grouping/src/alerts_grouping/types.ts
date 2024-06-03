/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { Filter, Query } from '@kbn/es-query';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { ValidFeatureId } from '@kbn/rule-data-utils';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { DataViewsServicePublic } from '@kbn/data-views-plugin/public/types';
import type { HttpSetup } from '@kbn/core-http-browser';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import {
  GenericBuckets,
  GroupingProps,
  GroupOption,
  GroupPanelRenderer,
  GroupStatsRenderers,
  NamedAggregation,
} from '@kbn/grouping/src';
import { ReactElement } from 'react';

export interface GroupModel {
  activeGroups: string[];
  options: Array<{ key: string; label: string }>;
}

export interface AlertsGroupingState {
  [groupingId: string]: GroupModel;
}

type NumberOrNull = number | null;

export interface AlertsGroupingProps<T = {}> {
  /**
   * The leaf component that will be rendered in the grouping panels
   */
  children: (groupingFilters: Filter[]) => ReactElement;
  /**
   * Render function for the group panel header
   */
  renderGroupPanel?: GroupPanelRenderer<T>;
  /**
   * A function that given the current grouping field, returns an array of
   * render functions for the group stats
   */
  groupStatsRenderers?: GroupStatsRenderers<T>;
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
   * The alerting feature ids this grouping covers
   */
  featureIds: ValidFeatureId[];
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
    storage: Storage;
    uiSettings: IUiSettingsClient;
    notifications: NotificationsStart;
    dataViews: DataViewsServicePublic;
    http: HttpSetup;
    data: DataPublicPluginStart;
  };
}

export interface AlertsGroupingAggregation {
  unitsCount?: {
    value?: NumberOrNull;
  };
  description?: {
    buckets?: GenericBuckets[];
  };
  severitiesSubAggregation?: {
    buckets?: GenericBuckets[];
  };
  countSeveritySubAggregation?: {
    value?: NumberOrNull;
  };
  usersCountAggregation?: {
    value?: NumberOrNull;
  };
  hostsCountAggregation?: {
    value?: NumberOrNull;
  };
  ipsCountAggregation?: {
    value?: NumberOrNull;
  };
  rulesCountAggregation?: {
    value?: NumberOrNull;
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
}

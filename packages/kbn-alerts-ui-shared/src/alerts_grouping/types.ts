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
import { GenericBuckets, GroupOption, NamedAggregation } from '@kbn/securitysolution-grouping/src';

export interface GroupModel {
  activeGroups: string[];
  options: Array<{ key: string; label: string }>;
}

export interface AlertsGroupingState {
  [tableId: string]: GroupModel;
}

type NumberOrNull = number | null;

export interface AlertsGroupingProps {
  // TODO
  // currentAlertStatusFilterValue?: Status[];
  // runtimeMappings: RunTimeMappings;
  defaultFilters?: Filter[];
  defaultGroupingOptions: GroupOption[];
  featureIds: ValidFeatureId[];
  from: string;
  globalFilters: Filter[];
  globalQuery: Query;
  hasIndexMaintenance: boolean;
  hasIndexWrite: boolean;
  loading: boolean;
  renderChildComponent: (groupingFilters: Filter[]) => React.ReactElement;
  signalIndexName?: string | null;
  tableId: string;
  to: string;
  getAggregationsByGroupingField: (field: string) => NamedAggregation[];
  services: {
    storage: Storage;
    // telemetry: TelemetryClientStart;
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

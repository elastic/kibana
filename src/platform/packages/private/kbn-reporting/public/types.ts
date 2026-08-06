/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { HomePublicPluginStart } from '@kbn/home-plugin/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { ManagementStart } from '@kbn/management-plugin/public';
import type { SharePluginStart, SharingData } from '@kbn/share-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import type { LocatorParams } from '@kbn/reporting-common/types';
import type { TimeRange } from '@kbn/es-query';
import type { SerializableRecord } from '@kbn/utility-types';

export interface ReportingPublicPluginStartDependencies {
  home: HomePublicPluginStart;
  data: DataPublicPluginStart;
  management: ManagementStart;
  licensing: LicensingPluginStart;
  uiActions: UiActionsStart;
  share: SharePluginStart;
}

export interface ClientConfigType {
  csv: {
    scroll: {
      duration: string;
      size: number;
    };
    maxRows: number;
  };
  poll: {
    jobsRefresh: {
      interval: number;
      intervalErrorMultiplier: number;
    };
  };
  export_types: {
    pdf: { enabled: boolean };
    png: { enabled: boolean };
    csv: { enabled: boolean };
  };
  statefulSettings: { enabled: boolean };
}

export type ReportingCSVSharingDataLocatorParams = Array<
  LocatorParams<SerializableRecord & { timeRange: TimeRange | undefined }>
>;

export interface ReportingCSVSharingData extends SharingData {
  locatorParams: ReportingCSVSharingDataLocatorParams;
  isTextBased: boolean;
  getSearchSource: (args: {
    addGlobalTimeFilter?: boolean;
    absoluteTime?: boolean;
  }) => SerializedSearchSourceFields;
  columns: string[] | undefined;
  absoluteTimeRange: TimeRange | undefined;
}

export interface ReportParamsGetterOptions<S extends SharingData = SharingData> {
  objectType?: string;
  sharingData: S;
}

export type ReportParamsGetter<
  O extends ReportParamsGetterOptions = ReportParamsGetterOptions,
  T = unknown
> = (options: O) => T;

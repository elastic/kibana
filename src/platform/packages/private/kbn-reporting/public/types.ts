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
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';

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

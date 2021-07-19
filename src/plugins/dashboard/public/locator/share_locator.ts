/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { Filter, Query } from '../../../data/public';
import { LocatorDefinition, LocatorPublic } from '../../../share/public';
import type { DashboardOptions, DashboardPanelMap } from '../types';
import { ViewMode } from '../../../embeddable/public';
import { DashboardConstants } from '../dashboard_constants';
import { setStateToKbnUrl } from '../services/kibana_utils';
import { stateToRawDashboardState } from '../application/lib/convert_dashboard_state';

export const DASHBOARD_SHARE_LOCATOR = 'DASHBOARD_SHARE_LOCATOR';

export interface DashboardShareLocatorParams extends SerializableRecord {
  query: Query;
  title: string;
  tags: string[];
  filters: Filter[];
  viewMode: ViewMode;
  description: string;
  savedQuery?: string;
  timeRestore: boolean;
  fullScreenMode: boolean;
  expandedPanelId?: string;
  options: DashboardOptions & SerializableRecord;
  panels: DashboardPanelMap & SerializableRecord;
}

export type DashboardShareLocator = LocatorPublic<DashboardShareLocatorParams>;

export interface DashboardShareLocatorDependencies {
  kibanaVersion: string;
}

export class DashboardShareLocatorDefinition
  implements LocatorDefinition<DashboardShareLocatorParams> {
  public readonly id = DASHBOARD_SHARE_LOCATOR;

  constructor(protected readonly deps: DashboardShareLocatorDependencies) {}

  public readonly getLocation = async (params: DashboardShareLocatorParams) => {
    const version = this.deps.kibanaVersion;

    const path = setStateToKbnUrl(
      '_a',
      stateToRawDashboardState({ state: params, version }),
      { useHash: false, storeInHashQuery: true },
      '#/create'
    );

    return {
      app: DashboardConstants.DASHBOARDS_ID,
      path,
      state: {},
    };
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ControlPanelsState } from "@kbn/control-group-renderer";
import { OptionsListESQLControlState } from "@kbn/controls-schemas";
import { DataViewSpec } from "@kbn/data-views-plugin/common";
import { DiscoverAppLocatorParams, ProfileStateMap } from "@kbn/discover-utils";
import { LocatorDefinition, LocatorPublic } from "@kbn/share-plugin/common";

export interface TabsUrlState {
  /**
   * Syncing the selected tab id with the URL
   */
  tabId?: string;
  /**
   * (Optional) Label for the tab, used when creating a new tab via locator URL or opening a shared link.
   */
  tabLabel?: string;
}

export type DiscoverAppLocator = LocatorPublic<DiscoverAppLocatorParams>;

/**
 * Location state of scoped history (history instance of Kibana Platform application service)
 */
export interface MainHistoryLocationState {
  dataViewSpec?: DataViewSpec;
  esqlControls?: ControlPanelsState<OptionsListESQLControlState>;
  isAlertResults?: boolean;
  profileState?: ProfileStateMap;
}

export type DiscoverAppLocatorGetLocation =
  LocatorDefinition<DiscoverAppLocatorParams>['getLocation'];

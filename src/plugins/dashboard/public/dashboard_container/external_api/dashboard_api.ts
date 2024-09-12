/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import { CanDuplicatePanels, CanExpandPanels, TracksOverlays } from '@kbn/presentation-containers';
import {
  HasTypeDisplayName,
  PublishesSavedObjectId,
} from '@kbn/presentation-publishing';
import { DashboardPanelState } from '../../../common';
import { DashboardContainer } from '../embeddable/dashboard_container';

export const buildApiFromDashboardContainer = (container?: DashboardContainer) => container ?? null;

export type DashboardExternallyAccessibleApi = HasTypeDisplayName &
  CanDuplicatePanels &
  TracksOverlays &
  PublishesSavedObjectId &
  DashboardPluginInternalFunctions &
  CanExpandPanels;

/**
 * An interface that holds types for the methods that Dashboard publishes which should not be used
 * outside of the Dashboard plugin. This is necessary for some actions which reside in the Dashboard plugin.
 */
export interface DashboardPluginInternalFunctions {
  /**
   * A temporary backdoor to allow some actions access to the Dashboard panels. This should eventually be replaced with a generic version
   * on the PresentationContainer interface.
   */
  getDashboardPanelFromId: (id: string) => Promise<DashboardPanelState>;

  /**
   * A temporary backdoor to allow the filters notification popover to get the data views directly from the dashboard container
   */
  getAllDataViews: () => DataView[];
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { replaceUrlHashQuery } from '../../../../kibana_utils/public/state_management/url/format';
import { convertSavedDashboardPanelToPanelState } from '../../../common/embeddable/embeddable_saved_object_converters';
import type { SavedDashboardPanel } from '../../../common/types';
import { DASHBOARD_STATE_STORAGE_KEY } from '../../dashboard_constants';
import type {
  DashboardBuildContext,
  DashboardPanelMap,
  DashboardState,
  RawDashboardState,
} from '../../types';
import { migrateAppState } from './migrate_app_state';
import { migrateLegacyQuery } from './migrate_legacy_query';

/**
 * Loads any dashboard state from the URL, and removes the state from the URL.
 */
export const loadDashboardUrlState = ({
  kibanaVersion,
  usageCollection,
  kbnUrlStateStorage,
}: DashboardBuildContext): Partial<DashboardState> => {
  const rawAppStateInUrl = kbnUrlStateStorage.get<RawDashboardState>(DASHBOARD_STATE_STORAGE_KEY);
  if (!rawAppStateInUrl) return {};

  const panelsMap: DashboardPanelMap = {};
  if (rawAppStateInUrl.panels && rawAppStateInUrl.panels.length > 0) {
    const rawState = migrateAppState(rawAppStateInUrl, kibanaVersion, usageCollection);
    rawState.panels?.forEach((panel: SavedDashboardPanel) => {
      panelsMap[panel.panelIndex] = convertSavedDashboardPanelToPanelState(panel);
    });
  }

  const migratedQuery = rawAppStateInUrl.query
    ? migrateLegacyQuery(rawAppStateInUrl.query)
    : undefined;

  // remove state from URL
  kbnUrlStateStorage.kbnUrlControls.updateAsync((nextUrl) => {
    if (nextUrl.includes(DASHBOARD_STATE_STORAGE_KEY)) {
      return replaceUrlHashQuery(nextUrl, (query) => {
        delete query[DASHBOARD_STATE_STORAGE_KEY];
        return query;
      });
    }
    return nextUrl;
  }, true);

  return {
    ..._.omit(rawAppStateInUrl, ['panels', 'query']),
    ...(migratedQuery ? { query: migratedQuery } : {}),
    ...(rawAppStateInUrl.panels ? { panels: panelsMap } : {}),
  };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import semverSatisfies from 'semver/functions/satisfies';
import { i18n } from '@kbn/i18n';
import { METRIC_TYPE } from '@kbn/analytics';

import { UsageCollectionSetup } from '../../services/usage_collection';
import { DashboardAppState, SavedDashboardPanel } from '../../types';
import {
  migratePanelsTo730,
  SavedDashboardPanelTo60,
  SavedDashboardPanel730ToLatest,
  SavedDashboardPanel610,
  SavedDashboardPanel630,
  SavedDashboardPanel640To720,
  SavedDashboardPanel620,
} from '../../../common';

/**
 * Attempts to migrate the state stored in the URL into the latest version of it.
 *
 * Once we hit a major version, we can remove support for older style URLs and get rid of this logic.
 */
export function migrateAppState(
  appState: { [key: string]: any } & DashboardAppState,
  kibanaVersion: string,
  usageCollection?: UsageCollectionSetup
): DashboardAppState {
  if (!appState.panels) {
    throw new Error(
      i18n.translate('dashboard.panel.invalidData', {
        defaultMessage: 'Invalid data in url',
      })
    );
  }

  const panelNeedsMigration = (appState.panels as Array<
    | SavedDashboardPanelTo60
    | SavedDashboardPanel610
    | SavedDashboardPanel620
    | SavedDashboardPanel630
    | SavedDashboardPanel640To720
    | SavedDashboardPanel730ToLatest
  >).some((panel) => {
    if ((panel as { version?: string }).version === undefined) return true;

    const version = (panel as SavedDashboardPanel730ToLatest).version;

    if (usageCollection) {
      // This will help us figure out when to remove support for older style URLs.
      usageCollection.reportUiCounter(
        'DashboardPanelVersionInUrl',
        METRIC_TYPE.LOADED,
        `${version}`
      );
    }

    return semverSatisfies(version, '<7.3');
  });

  if (panelNeedsMigration) {
    appState.panels = migratePanelsTo730(
      appState.panels as Array<
        | SavedDashboardPanelTo60
        | SavedDashboardPanel610
        | SavedDashboardPanel620
        | SavedDashboardPanel630
        | SavedDashboardPanel640To720
      >,
      kibanaVersion,
      appState.useMargins as boolean,
      appState.uiState as Record<string, Record<string, unknown>>
    ) as SavedDashboardPanel[];
    delete appState.uiState;
  }

  return appState;
}

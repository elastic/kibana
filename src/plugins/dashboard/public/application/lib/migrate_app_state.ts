/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import semver from 'semver';
import { i18n } from '@kbn/i18n';
import { METRIC_TYPE } from '@kbn/analytics';

import { UsageCollectionSetup } from 'src/plugins/usage_collection/public';
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
      usageCollection.reportUiStats('DashboardPanelVersionInUrl', METRIC_TYPE.LOADED, `${version}`);
    }

    return semver.satisfies(version, '<7.3');
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

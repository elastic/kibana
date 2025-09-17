/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type {
  CoreStart,
  HttpStart,
  I18nStart,
  IUiSettingsClient,
  StartServicesAccessor,
} from '@kbn/core/public';
import type { CoreSetup } from '@kbn/core/public';
import type { ManagementApp, ManagementSetup } from '@kbn/management-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { ISessionsClient, SearchUsageCollector } from '../../..';
import { SEARCH_SESSIONS_MANAGEMENT_ID, BACKGROUND_SEARCH_FEATURE_FLAG_KEY } from '../constants';
import type { SearchSessionsMgmtAPI } from './lib/api';
import type { AsyncSearchIntroDocumentation } from './lib/documentation';
import type { SearchSessionsConfigSchema } from '../../../../server/config';

export { openSearchSessionsFlyout } from './flyout/get_flyout';
export type { BackgroundSearchOpenedHandler } from './types';

export interface IManagementSectionsPluginsSetup {
  management: ManagementSetup;
  searchUsageCollector: SearchUsageCollector;
  sessionsClient: ISessionsClient;
}

export interface IManagementSectionsPluginsStart {
  share: SharePluginStart;
}

export interface AppDependencies {
  share: SharePluginStart;
  uiSettings: IUiSettingsClient;
  documentation: AsyncSearchIntroDocumentation;
  core: CoreStart; // for RedirectAppLinks
  api: SearchSessionsMgmtAPI;
  http: HttpStart;
  i18n: I18nStart;
  config: SearchSessionsConfigSchema;
  kibanaVersion: string;
  searchUsageCollector: SearchUsageCollector;
}

export const APP = {
  id: SEARCH_SESSIONS_MANAGEMENT_ID,
  getI18nName: (hasBackgroundSearchEnabled: boolean): string =>
    hasBackgroundSearchEnabled
      ? i18n.translate('data.mgmt.backgroundSearch.appTitle', {
          defaultMessage: 'Background Search',
        })
      : i18n.translate('data.mgmt.searchSessions.appTitle', {
          defaultMessage: 'Search Sessions',
        }),
};

export function registerSearchSessionsMgmt(
  coreSetup: CoreSetup<IManagementSectionsPluginsStart>,
  deps: IManagementSectionsPluginsSetup,
  config: SearchSessionsConfigSchema,
  kibanaVersion: string
) {
  return deps.management.sections.section.kibana.registerApp({
    id: APP.id,
    title: APP.getI18nName(false),
    order: 1.75,
    mount: async (params) => {
      const { SearchSessionsMgmtApp: MgmtApp } = await import('./application');
      const mgmtApp = new MgmtApp(coreSetup, deps, config, kibanaVersion, params);
      return mgmtApp.mountManagementSection();
    },
  });
}

export async function updateSearchSessionMgmtSectionTitle(
  getStartServices: StartServicesAccessor,
  app: ManagementApp | undefined
) {
  if (!app) return;

  const [coreStart] = await getStartServices();
  const hasBackgroundSearchEnabled = coreStart.featureFlags.getBooleanValue(
    BACKGROUND_SEARCH_FEATURE_FLAG_KEY,
    false
  );

  if (hasBackgroundSearchEnabled) {
    // @ts-expect-error
    // This apps are supposed to be readonly but I can't find a different workaround to make it work.
    // If I go in manually everything works correctly but if I await the start services before registering the app the
    // functional tests can't find it. This is temporary until we remove the feature flag.
    app.title = APP.getI18nName(true);
  }
}

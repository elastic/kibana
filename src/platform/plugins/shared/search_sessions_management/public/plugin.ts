/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { ISearchSetup } from '@kbn/data-plugin/public';
import { BackgroundSearchNotifier } from './background_search_notifier';
import { BACKGROUND_SESSION_POLLING_INTERVAL } from './constants';
import { registerSearchSessionsMgmt } from './sessions_mgmt';
import type {
  SearchSessionsManagementPluginStart,
  SearchSessionsManagementSetupDependencies,
  SearchSessionsManagementStartDependencies,
} from './types';

export class SearchSessionsManagementPlugin
  implements
    Plugin<
      void,
      SearchSessionsManagementPluginStart,
      SearchSessionsManagementSetupDependencies,
      SearchSessionsManagementStartDependencies
    >
{
  private readonly kibanaVersion: string;
  private searchSetup!: ISearchSetup;
  private backgroundSearchNotifier?: BackgroundSearchNotifier;

  constructor(initializerContext: PluginInitializerContext) {
    this.kibanaVersion = initializerContext.env.packageInfo.version;
  }

  public setup(
    core: CoreSetup<SearchSessionsManagementStartDependencies>,
    { data, management }: SearchSessionsManagementSetupDependencies
  ) {
    this.searchSetup = data.search;
    const { sessionsConfig, usageCollector, sessionsClient, ebtManager } = data.search;

    if (!sessionsConfig.enabled) return;

    registerSearchSessionsMgmt(
      core,
      {
        management,
        searchUsageCollector: usageCollector,
        sessionsClient,
        searchSessionEBTManager: ebtManager,
      },
      sessionsConfig,
      this.kibanaVersion
    );
  }

  public start(
    core: CoreStart,
    { share }: SearchSessionsManagementStartDependencies
  ): SearchSessionsManagementPluginStart {
    const { sessionsConfig, usageCollector, sessionsClient, ebtManager } = this.searchSetup;

    if (sessionsConfig.enabled) {
      this.backgroundSearchNotifier = new BackgroundSearchNotifier(
        sessionsClient,
        core,
        share.url.locators
      );
      this.backgroundSearchNotifier.startPolling(BACKGROUND_SESSION_POLLING_INTERVAL);
    }

    return {
      openFlyout: (attrs) => {
        // The flyout is loaded on demand to keep it out of the page load bundle
        void import('./sessions_mgmt/flyout/get_flyout').then(({ openSearchSessionsFlyout }) =>
          openSearchSessionsFlyout({
            coreStart: core,
            kibanaVersion: this.kibanaVersion,
            usageCollector,
            config: sessionsConfig,
            sessionsClient,
            ebtManager,
            share,
          })(attrs)
        );
      },
    };
  }

  public stop() {
    this.backgroundSearchNotifier?.stopPolling();
  }
}

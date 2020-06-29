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

import { PluginInitializerContext, CoreStart, CoreSetup } from 'kibana/public';
import { Subscription } from 'rxjs';
import { ConfigSchema } from '../config';
import { getDashboardConfig } from './dashboard_config';
import { navigateToDefaultApp } from './navigate_to_default_app';
import { createLegacyUrlForwardApp } from './forward_app';
import { injectHeaderStyle } from './utils/inject_header_style';
import { navigateToLegacyKibanaUrl } from './forward_app/navigate_to_legacy_kibana_url';

export interface ForwardDefinition {
  legacyAppId: string;
  newAppId: string;
  rewritePath: (legacyPath: string) => string;
}

export class KibanaLegacyPlugin {
  private forwardDefinitions: ForwardDefinition[] = [];
  private currentAppId: string | undefined;
  private currentAppIdSubscription: Subscription | undefined;

  constructor(private readonly initializerContext: PluginInitializerContext<ConfigSchema>) {}

  public setup(core: CoreSetup<{}, KibanaLegacyStart>) {
    core.application.register(createLegacyUrlForwardApp(core, this.forwardDefinitions));
    return {
      /**
       * Forwards URLs within the legacy `kibana` app to a new platform application.
       *
       * @param legacyAppId The name of the old app to forward URLs from
       * @param newAppId The name of the new app that handles the URLs now
       * @param rewritePath Function to rewrite the legacy sub path of the app to the new path in the core app.
       *        If none is provided, it will just strip the prefix of the legacyAppId away
       *
       * path into the new path
       *
       * Example usage:
       * ```
       * kibanaLegacy.forwardApp(
       *   'old',
       *   'new',
       *   path => {
       *     const [, id] = /old/item\/(.*)$/.exec(path) || [];
       *     if (!id) {
       *       return '#/home';
       *     }
       *     return '#/items/${id}';
       *  }
       * );
       * ```
       * This will cause the following redirects:
       *
       * * app/kibana#/old/ -> app/new#/home
       * * app/kibana#/old/item/123 -> app/new#/items/123
       *
       */
      forwardApp: (
        legacyAppId: string,
        newAppId: string,
        rewritePath?: (legacyPath: string) => string
      ) => {
        this.forwardDefinitions.push({
          legacyAppId,
          newAppId,
          rewritePath: rewritePath || ((path) => `#${path.replace(`/${legacyAppId}`, '') || '/'}`),
        });
      },
    };
  }

  public start({ application, http: { basePath }, uiSettings }: CoreStart) {
    this.currentAppIdSubscription = application.currentAppId$.subscribe((currentAppId) => {
      this.currentAppId = currentAppId;
    });
    injectHeaderStyle(uiSettings);
    return {
      /**
       * Used to power dashboard mode. Should be removed when dashboard mode is removed eventually.
       * @deprecated
       */
      dashboardConfig: getDashboardConfig(!application.capabilities.dashboard.showWriteControls),
      /**
       * Navigates to the app defined as kibana.defaultAppId.
       * This takes redirects into account and uses the right mechanism to navigate.
       */
      navigateToDefaultApp: (
        { overwriteHash }: { overwriteHash: boolean } = { overwriteHash: true }
      ) => {
        navigateToDefaultApp(
          this.initializerContext.config.get().defaultAppId,
          this.forwardDefinitions,
          application,
          basePath,
          this.currentAppId,
          overwriteHash
        );
      },
      /**
       * Resolves the provided hash using the registered forwards and navigates to the target app.
       * If a navigation happened, `{ navigated: true }` will be returned.
       * If no matching forward is found, `{ navigated: false }` will be returned.
       * @param hash
       */
      navigateToLegacyKibanaUrl: (hash: string) => {
        return navigateToLegacyKibanaUrl(hash, this.forwardDefinitions, basePath, application);
      },
      /**
       * Loads the font-awesome icon font. Should be removed once the last consumer has migrated to EUI
       * @deprecated
       */
      loadFontAwesome: async () => {
        await import('./font_awesome');
      },
      /**
       * @deprecated
       * Just exported for wiring up with legacy platform, should not be used.
       */
      getForwards: () => this.forwardDefinitions,
      /**
       * @deprecated
       * Just exported for wiring up with dashboard mode, should not be used.
       */
      config: this.initializerContext.config.get(),
    };
  }

  public stop() {
    if (this.currentAppIdSubscription) {
      this.currentAppIdSubscription.unsubscribe();
    }
  }
}

export type KibanaLegacySetup = ReturnType<KibanaLegacyPlugin['setup']>;
export type KibanaLegacyStart = ReturnType<KibanaLegacyPlugin['start']>;

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

// @ts-ignore
import { toastNotifications, banners } from 'ui/notify';
import { kfetch } from 'ui/kfetch';
import chrome from 'ui/chrome';

import { wrapInI18nContext } from 'ui/i18n';

// @ts-ignore
import { uiModules as modules } from 'ui/modules';
import routes from 'ui/routes';
import { npSetup, npStart } from 'ui/new_platform';
import { IPrivate } from 'ui/private';
import { FeatureCatalogueRegistryProvider } from 'ui/registry/feature_catalogue';
import { createUiStatsReporter, METRIC_TYPE } from '../../../ui_metric/public';
import { TelemetryOptInProvider } from '../../../telemetry/public/services';
import { start as data } from '../../../data/public/legacy';

let shouldShowTelemetryOptIn: boolean;
let telemetryOptInProvider: any;

export function getServices() {
  return {
    getInjected: npStart.core.injectedMetadata.getInjectedVar,
    metadata: npStart.core.injectedMetadata.getLegacyMetadata(),
    docLinks: npStart.core.docLinks,

    uiRoutes: routes,
    uiModules: modules,

    savedObjectsClient: npStart.core.savedObjects.client,
    chrome: npStart.core.chrome,
    uiSettings: npStart.core.uiSettings,
    addBasePath: npStart.core.http.basePath.prepend,
    getBasePath: npStart.core.http.basePath.get,

    indexPatternService: data.indexPatterns.indexPatterns,
    shouldShowTelemetryOptIn,
    telemetryOptInProvider,
    getFeatureCatalogueEntries: async () => {
      const injector = await chrome.dangerouslyGetActiveInjector();
      const Private = injector.get<IPrivate>('Private');
      // Merge legacy registry with new registry
      (Private(FeatureCatalogueRegistryProvider as any) as any).inTitleOrder.map(
        npSetup.plugins.feature_catalogue.register
      );
      return npStart.plugins.feature_catalogue.get();
    },

    trackUiMetric: createUiStatsReporter('Kibana_home'),
    METRIC_TYPE,

    toastNotifications,
    banners,
    kfetch,
    wrapInI18nContext,
  };
}

modules.get('kibana').run((Private: IPrivate) => {
  const telemetryEnabled = npStart.core.injectedMetadata.getInjectedVar('telemetryEnabled');
  const telemetryBanner = npStart.core.injectedMetadata.getInjectedVar('telemetryBanner');

  telemetryOptInProvider = Private(TelemetryOptInProvider);
  shouldShowTelemetryOptIn =
    telemetryEnabled && telemetryBanner && !telemetryOptInProvider.getOptIn();
});

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
import { uiModules as modules } from 'ui/modules';
import routes from 'ui/routes';
import { npStart } from 'ui/new_platform';
import { IPrivate } from 'ui/private';
import { FeatureCatalogueRegistryProvider } from 'ui/registry/feature_catalogue';
import { createUiStatsReporter, METRIC_TYPE } from '../../../ui_metric/public';
import { TelemetryOptInProvider } from '../../../telemetry/public/services';
import { start as data } from '../../../data/public/legacy';
// @ts-ignore
export { toastNotifications, banners } from 'ui/notify';
export { kfetch } from 'ui/kfetch';

export { wrapInI18nContext } from 'ui/i18n';
export const getInjected = npStart.core.injectedMetadata.getInjectedVar;
export const metadata = npStart.core.injectedMetadata.getLegacyMetadata();

export const docLinks = npStart.core.docLinks;

export const uiRoutes = routes;
export const uiModules = modules;

export const savedObjectsClient = npStart.core.savedObjects.client;
export const chrome = npStart.core.chrome;
export const uiSettings = npStart.core.uiSettings;
export const addBasePath = npStart.core.http.basePath.prepend;
export const getBasePath = npStart.core.http.basePath.get;

export const indexPatternService = data.indexPatterns.indexPatterns;
export let shouldShowTelemetryOptIn: boolean;
export let telemetryOptInProvider: any;
export let featureCatalogueRegistryProvider: any;

export const trackUiMetric = createUiStatsReporter('Kibana_home');
export { METRIC_TYPE };

modules.get('kibana').run((Private: IPrivate) => {
  const telemetryEnabled = npStart.core.injectedMetadata.getInjectedVar('telemetryEnabled');
  const telemetryBanner = npStart.core.injectedMetadata.getInjectedVar('telemetryBanner');

  telemetryOptInProvider = Private(TelemetryOptInProvider);
  shouldShowTelemetryOptIn =
    telemetryEnabled && telemetryBanner && !telemetryOptInProvider.getOptIn();
  featureCatalogueRegistryProvider = Private(FeatureCatalogueRegistryProvider as any);
});

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

import React from 'react';
import { DataStart } from 'src/legacy/core_plugins/data/public';
import { AppMountContext } from 'kibana/public';
import { Plugin as DataPlugin } from 'src/plugins/data/public';
import { render, unmountComponentAtNode } from 'react-dom';
import { i18n } from '@kbn/i18n';
import { LegacyAngularInjectedDependencies } from './plugin';
import { setDeps } from './kibana_services';

/**
 * These are dependencies of the Graph app besides the base dependencies
 * provided by the application service. Some of those still rely on non-shimmed
 * plugins in LP-world, but if they are migrated only the import path in the plugin
 * itself changes
 */
export interface HomeDependencies {
  element: HTMLElement;
  appBasePath: string;
  data: DataStart;
  npData: ReturnType<DataPlugin['start']>;
  uiStatsReporter: any;
  toastNotifications: any;
  banners: any;
  kfetch: any;
  metadata: any;
  savedObjectsClient: any;
  METRIC_TYPE: any;
}

export const renderApp = (
  { core }: AppMountContext,
  {
    element,
    appBasePath,
    data,
    npData,
    uiStatsReporter,
    toastNotifications,
    banners,
    kfetch,
    metadata,
    savedObjectsClient,
  }: HomeDependencies,
  angularDeps: LegacyAngularInjectedDependencies
) => {
  const deps = {
    getInjected: core.injectedMetadata.getInjectedVar,
    metadata,
    docLinks: core.docLinks,
    savedObjectsClient,
    chrome: core.chrome,
    uiSettings: core.uiSettings,
    addBasePath: core.http.basePath.prepend,
    getBasePath: core.http.basePath.get,
    indexPatternService: data.indexPatterns.indexPatterns,
    toastNotifications,
    banners,
    kfetch,
    ...angularDeps,
  };
  setDeps(deps);

  const homeTitle = i18n.translate('kbn.home.breadcrumbs.homeTitle', { defaultMessage: 'Home' });
  const directories = angularDeps.featureCatalogueRegistryProvider.inTitleOrder;
  core.chrome.setBreadcrumbs([{ text: homeTitle }]);

  const HomeApp = require('./components/home_app').HomeApp;
  render(<HomeApp directories={directories} />, element);

  return () => unmountComponentAtNode(element);
};

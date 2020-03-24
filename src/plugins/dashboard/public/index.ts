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

import './index.scss';

import { PluginInitializerContext } from '../../../core/public';
import { DashboardEmbeddableContainerPublicPlugin } from './plugin';

/**
 * These types can probably be internal once all of dashboard app is migrated into this plugin. Right
 * now, migrations are still in legacy land.
 */
export {
  DashboardDoc730ToLatest,
  DashboardDoc700To720,
  RawSavedDashboardPanelTo60,
  RawSavedDashboardPanel610,
  RawSavedDashboardPanel620,
  RawSavedDashboardPanel630,
  RawSavedDashboardPanel640To720,
  RawSavedDashboardPanel730ToLatest,
  DashboardDocPre700,
} from './bwc';

export {} from './types';
export {} from './actions';
export {
  DashboardContainer,
  DashboardContainerInput,
  DashboardContainerFactory,
  DASHBOARD_CONTAINER_TYPE,
  DashboardPanelState,
  // Types below here can likely be made private when dashboard app moved into this NP plugin.
  DEFAULT_PANEL_WIDTH,
  DEFAULT_PANEL_HEIGHT,
  GridData,
} from './embeddable';

export { SavedObjectDashboard } from './saved_dashboards';
export { DashboardStart } from './plugin';

export { DashboardEmbeddableContainerPublicPlugin as Plugin };

export { DASHBOARD_APP_URL_GENERATOR } from './url_generator';

export function plugin(initializerContext: PluginInitializerContext) {
  return new DashboardEmbeddableContainerPublicPlugin(initializerContext);
}

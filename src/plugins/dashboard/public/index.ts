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

import { PluginInitializerContext } from '../../../core/public';
import { DashboardPlugin } from './plugin';

export {
  DashboardContainer,
  DashboardContainerInput,
  DashboardContainerFactoryDefinition,
  DASHBOARD_CONTAINER_TYPE,
  // Types below here can likely be made private when dashboard app moved into this NP plugin.
  DEFAULT_PANEL_WIDTH,
  DEFAULT_PANEL_HEIGHT,
} from './application';
export { DashboardConstants, createDashboardEditUrl } from './dashboard_constants';

export { DashboardStart, DashboardUrlGenerator } from './plugin';
export { DASHBOARD_APP_URL_GENERATOR, createDashboardUrlGenerator } from './url_generator';
export { addEmbeddableToDashboardUrl } from './url_utils/url_helper';
export { SavedObjectDashboard } from './saved_dashboards';
export { SavedDashboardPanel } from './types';

export function plugin(initializerContext: PluginInitializerContext) {
  return new DashboardPlugin(initializerContext);
}

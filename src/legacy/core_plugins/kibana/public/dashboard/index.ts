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

import { PluginInitializerContext } from 'kibana/public';
import { DashboardPlugin } from './plugin';

export * from './np_ready/dashboard_constants';
export { createSavedDashboardLoader } from './saved_dashboard/saved_dashboards';

// Core will be looking for this when loading our plugin in the new platform
export const plugin = (context: PluginInitializerContext) => {
  return new DashboardPlugin(context);
};

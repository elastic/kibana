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

import RouteManager from './route_manager';
import 'angular-route/angular-route';
import { uiModules } from '../modules';
import { WAIT_FOR_URL_CHANGE_TOKEN } from './route_setup_manager';
const defaultRouteManager = new RouteManager();

export const uiRoutes = Object.create(defaultRouteManager, {
  WAIT_FOR_URL_CHANGE_TOKEN: {
    value: WAIT_FOR_URL_CHANGE_TOKEN,
  },

  enable: {
    value() {
      uiModules
        .get('kibana', ['ngRoute'])
        .config(defaultRouteManager.config)
        .run(defaultRouteManager.run);
    },
  },
});

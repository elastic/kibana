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

import { get } from 'lodash';
import chrome from 'ui/chrome';
import uiRoutes from 'ui/routes';
import { UICapabilities } from './ui_capabilities';

uiRoutes.addSetupWork((uiCapabilities: UICapabilities, kbnBaseUrl: string, $route: any) => {
  console.log('Doing the setup work');
  const route = get($route, 'current.$$route') as any;
  if (!route.requireUICapability) {
    console.log(`Route doesn't require ui capability`);
    return;
  }

  if (!get(uiCapabilities, route.requireUICapability)) {
    console.log(`Redirecting`);
    const url = chrome.addBasePath(`${kbnBaseUrl}#/home`);
    window.location.href = url;
  } else {
    console.log(`We're good`);
  }
});

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

import _ from 'lodash';
import { uiModules } from '../modules';

let baseTitle = document.title;

// for karma test
export function setBaseTitle(str) {
  baseTitle = str;
}

let lastChange;

function render() {
  lastChange = lastChange || [];

  const parts = [lastChange[0]];

  if (!lastChange[1]) parts.push(baseTitle);

  return _(parts)
    .flattenDeep()
    .compact()
    .join(' - ');
}

function change(title, complete) {
  lastChange = [title, complete];
  update();
}

function reset() {
  lastChange = null;
}

function update() {
  document.title = render();
}

export const docTitle = {
  render,
  change,
  reset,
  update,
};

uiModules.get('kibana').run(function($rootScope) {
  // always bind to the route events
  $rootScope.$on('$routeChangeStart', docTitle.reset);
  $rootScope.$on('$routeChangeError', docTitle.update);
  $rootScope.$on('$routeChangeSuccess', docTitle.update);
});

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

import { uiModules } from '../../modules';

import { directivesProvider } from '../directives';
import { registerSubUrlHooks } from './sub_url_hooks';
import { configureAppAngularModule } from 'ui/legacy_compat';
import { npStart } from '../../new_platform/new_platform';

export function initAngularApi(chrome, internals) {
  chrome.setupAngular = function() {
    const kibana = uiModules.get('kibana');

    configureAppAngularModule(kibana, npStart.core, false);

    kibana.value('chrome', chrome);

    registerSubUrlHooks(kibana, internals);
    directivesProvider(chrome, internals);

    uiModules.link(kibana);
  };
}

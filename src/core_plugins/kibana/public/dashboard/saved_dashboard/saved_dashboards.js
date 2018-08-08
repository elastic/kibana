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

import './saved_dashboard';
import { uiModules } from 'ui/modules';
import { SavedObjectLoader } from 'ui/courier/saved_object/saved_object_loader';
import { savedObjectManagementRegistry } from '../../management/saved_object_registry';
import { SavedObjectsClientProvider } from 'ui/saved_objects';

const module = uiModules.get('app/dashboard');

// Register this service with the saved object registry so it can be
// edited by the object editor.
savedObjectManagementRegistry.register({
  service: 'savedDashboards',
  title: 'dashboards'
});

// This is the only thing that gets injected into controllers
module.service('savedDashboards', function (Private, SavedDashboard, kbnIndex, kbnUrl, $http, chrome) {
  const savedObjectClient = Private(SavedObjectsClientProvider);
  return new SavedObjectLoader(SavedDashboard, kbnIndex, kbnUrl, $http, chrome, savedObjectClient);
});

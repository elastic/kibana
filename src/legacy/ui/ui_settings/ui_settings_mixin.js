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

import { uiSettingsServiceFactory } from './ui_settings_service_factory';
import { getUiSettingsServiceForRequest } from './ui_settings_service_for_request';

export function uiSettingsMixin(kbnServer, server) {
  const { uiSettingDefaults = {} } = kbnServer.uiExports;
  const mergedUiSettingDefaults = Object.keys(uiSettingDefaults).reduce((acc, currentKey) => {
    const defaultSetting = uiSettingDefaults[currentKey];
    const updatedDefaultSetting = {
      ...defaultSetting,
    };
    if (typeof defaultSetting.options === 'function') {
      updatedDefaultSetting.options = defaultSetting.options(server);
    }
    if (typeof defaultSetting.value === 'function') {
      updatedDefaultSetting.value = defaultSetting.value(server);
    }
    acc[currentKey] = updatedDefaultSetting;
    return acc;
  }, {});

  kbnServer.newPlatform.__internals.uiSettings.register(mergedUiSettingDefaults);

  server.decorate('server', 'uiSettingsServiceFactory', (options = {}) => {
    return uiSettingsServiceFactory(server, options);
  });

  server.addMemoizedFactoryToRequest('getUiSettingsService', request => {
    return getUiSettingsServiceForRequest(server, request);
  });

  server.decorate('server', 'uiSettings', () => {
    throw new Error(`
      server.uiSettings has been removed, see https://github.com/elastic/kibana/pull/12243.
    `);
  });
}

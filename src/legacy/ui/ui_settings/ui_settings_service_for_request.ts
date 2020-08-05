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

import { Legacy } from 'kibana';
import { IUiSettingsClient } from 'src/core/server';
import { uiSettingsServiceFactory } from './ui_settings_service_factory';

/**
 *  Get/create an instance of UiSettingsService bound to a specific request.
 *  Each call is cached (keyed on the request object itself) and subsequent
 *  requests will get the first UiSettingsService instance even if the `options`
 *  have changed.
 *
 *  @param {Hapi.Server} server
 *  @param {Hapi.Request} request
 *  @param {Object} [options={}]

 *  @return {IUiSettingsClient}
 */
export function getUiSettingsServiceForRequest(
  server: Legacy.Server,
  request: Legacy.Request
): IUiSettingsClient {
  const savedObjectsClient = request.getSavedObjectsClient();
  return uiSettingsServiceFactory(server, { savedObjectsClient });
}

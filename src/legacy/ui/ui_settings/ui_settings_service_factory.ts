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
import {
  IUiSettingsService,
  UiSettingsService,
  UiSettingsServiceOptions,
} from './ui_settings_service';

type Options = Pick<UiSettingsServiceOptions, 'savedObjectsClient' | 'getDefaults' | 'overrides'>;
/**
 *  Create an instance of UiSettingsService that will use the
 *  passed `savedObjectsClient` to communicate with elasticsearch
 *
 *  @return {IUiSettingsService}
 */
export function uiSettingsServiceFactory(
  server: Legacy.Server,
  options: Options
): IUiSettingsService {
  const config = server.config();

  const { savedObjectsClient, getDefaults, overrides } = options;

  return new UiSettingsService({
    type: 'config',
    id: config.get('pkg.version'),
    buildNum: config.get('pkg.buildNum'),
    savedObjectsClient,
    getDefaults,
    overrides,
    logWithMetadata: server.logWithMetadata,
  });
}

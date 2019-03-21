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

import * as BasePath from './base_path';
import * as Chrome from './chrome';
import * as FatalErrors from './fatal_errors';
import * as Http from './http';
import * as I18n from './i18n';
import * as InjectedMetadata from './injected_metadata';
import * as Notifications from './notifications';
import * as UiSettings from './ui_settings';

export { CoreSystem } from './core_system';

export interface CoreStart {
  i18n: I18n.I18nStart;
  injectedMetadata: InjectedMetadata.InjectedMetadataStart;
  fatalErrors: FatalErrors.FatalErrorsStart;
  notifications: Notifications.NotificationsStart;
  http: Http.HttpStart;
  basePath: BasePath.BasePathStart;
  uiSettings: UiSettings.UiSettingsStart;
  chrome: Chrome.ChromeStart;
}

export { BasePath, Chrome, FatalErrors, Http, I18n, InjectedMetadata, Notifications, UiSettings };

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

import { BasePathSetup } from '../../../../core/public/base_path';
import { ChromeSetup } from '../../../../core/public/chrome';
import { FatalErrorsSetup } from '../../../../core/public/fatal_errors';
import { HttpSetup } from '../../../../core/public/http';
import { I18nSetup } from '../../../../core/public/i18n';
import { InjectedMetadataSetup } from '../../../../core/public/injected_metadata';
import { NotificationsSetup } from '../../../../core/public/notifications';
import { UiSettingsSetup } from '../../../../core/public/ui_settings';

interface CoreSetup {
  i18n: I18nSetup;
  injectedMetadata: InjectedMetadataSetup;
  fatalErrors: FatalErrorsSetup;
  notifications: NotificationsSetup;
  http: HttpSetup;
  basePath: BasePathSetup;
  uiSettings: UiSettingsSetup;
  chrome: ChromeSetup;
}

const runtimeContext = {
  setup: {
    core: null as CoreSetup | null,
    plugins: {},
  },
};

export function __newPlatformInit__(core: CoreSetup) {
  if (runtimeContext.setup.core) {
    throw new Error('New platform core api was already initialized');
  }

  runtimeContext.setup.core = core;
}

export function getNewPlatform() {
  return runtimeContext;
}

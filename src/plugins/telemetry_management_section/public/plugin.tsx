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
import { AdvancedSettingsSetup } from 'src/plugins/advanced_settings/public';
import { TelemetryPluginSetup } from 'src/plugins/telemetry/public';
import { Plugin, CoreStart, CoreSetup } from '../../../core/public';

import { telemetryManagementSectionWrapper } from './components/telemetry_management_section_wrapper';

export interface TelemetryPluginConfig {
  enabled: boolean;
  url: string;
  banner: boolean;
  allowChangingOptInStatus: boolean;
  optIn: boolean | null;
  optInStatusUrl: string;
  sendUsageFrom: 'browser' | 'server';
  telemetryNotifyUserAboutOptInDefault?: boolean;
}

export interface TelemetryManagementSectionPluginDepsSetup {
  telemetry: TelemetryPluginSetup;
  advancedSettings: AdvancedSettingsSetup;
}

export class TelemetryManagementSectionPlugin implements Plugin {
  public setup(
    core: CoreSetup,
    { advancedSettings, telemetry: { telemetryService } }: TelemetryManagementSectionPluginDepsSetup
  ) {
    advancedSettings.component.register(
      advancedSettings.component.componentType.PAGE_FOOTER_COMPONENT,
      telemetryManagementSectionWrapper(telemetryService),
      true
    );
  }

  public start(core: CoreStart) {}
}

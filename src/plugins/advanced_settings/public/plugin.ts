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

import { CoreSetup, CoreStart, Plugin } from 'kibana/public';
import { ComponentRegistry } from './component_registry';
import { AdvancedSettingsSetup, AdvancedSettingsStart, AdvancedSettingsPluginSetup } from './types';
import { registerAdvSettingsMgmntApp } from './management_app';

const component = new ComponentRegistry();

export class AdvancedSettingsPlugin
  implements Plugin<AdvancedSettingsSetup, AdvancedSettingsStart, AdvancedSettingsPluginSetup> {
  public setup(core: CoreSetup, { management }: AdvancedSettingsPluginSetup) {
    registerAdvSettingsMgmntApp({
      management,
      getStartServices: core.getStartServices,
      componentRegistry: component.start,
    });

    return {
      component: component.setup,
    };
  }

  public start(core: CoreStart) {
    return {
      component: component.start,
    };
  }
}

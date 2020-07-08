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
import { i18n } from '@kbn/i18n';
import { CoreSetup, Plugin } from 'kibana/public';
import { ComponentRegistry } from './component_registry';
import { AdvancedSettingsSetup, AdvancedSettingsStart, AdvancedSettingsPluginSetup } from './types';

const component = new ComponentRegistry();

const title = i18n.translate('advancedSettings.advancedSettingsLabel', {
  defaultMessage: 'Advanced Settings',
});

export class AdvancedSettingsPlugin
  implements Plugin<AdvancedSettingsSetup, AdvancedSettingsStart, AdvancedSettingsPluginSetup> {
  public setup(core: CoreSetup, { management }: AdvancedSettingsPluginSetup) {
    const kibanaSection = management.sections.section.kibana;

    kibanaSection.registerApp({
      id: 'settings',
      title,
      order: 3,
      async mount(params) {
        const { mountManagementSection } = await import(
          './management_app/mount_management_section'
        );
        return mountManagementSection(core.getStartServices, params, component.start);
      },
    });

    return {
      component: component.setup,
    };
  }

  public start() {
    return {
      component: component.start,
    };
  }
}

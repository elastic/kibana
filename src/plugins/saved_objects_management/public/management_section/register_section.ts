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
import { CoreSetup } from 'src/core/public';
import { ManagementSetup } from '../../../management/public';
import { StartDependencies, SavedObjectsManagementPluginStart } from '../plugin';
import { ISavedObjectsManagementServiceRegistry } from '../services';

interface RegisterOptions {
  core: CoreSetup<StartDependencies, SavedObjectsManagementPluginStart>;
  sections: ManagementSetup['sections'];
  serviceRegistry: ISavedObjectsManagementServiceRegistry;
}

const title = i18n.translate('savedObjectsManagement.managementSectionLabel', {
  defaultMessage: 'Saved Objects',
});

export const registerManagementSection = ({ core, sections, serviceRegistry }: RegisterOptions) => {
  const kibanaSection = sections.getSection('kibana');
  if (!kibanaSection) {
    throw new Error('`kibana` management section not found.');
  }
  kibanaSection.registerApp({
    id: 'objects',
    title,
    order: 10,
    mount: async mountParams => {
      const { mountManagementSection } = await import('./mount_section');
      return mountManagementSection({ core, serviceRegistry, mountParams });
    },
  });
};

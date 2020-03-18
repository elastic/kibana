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
import { UiActionsStart } from '../../../../../src/plugins/ui_actions/public';
import { EmbeddableStart } from '../../../../../src/plugins/embeddable/public';
import { CoreStart } from '../../../../core/public';
import {
  ContainerOutput,
  EmbeddableFactoryDefinition,
  ErrorEmbeddable,
  Container,
} from '../embeddable_plugin';
import { DashboardContainer, DashboardContainerInput } from './dashboard_container';
import { DASHBOARD_CONTAINER_TYPE } from './dashboard_constants';
import { Start as InspectorStartContract } from '../../../inspector/public';

interface StartServices {
  capabilities: CoreStart['application']['capabilities'];
  application: CoreStart['application'];
  overlays: CoreStart['overlays'];
  notifications: CoreStart['notifications'];
  embeddable: EmbeddableStart;
  inspector: InspectorStartContract;
  SavedObjectFinder: React.ComponentType<any>;
  ExitFullScreenButton: React.ComponentType<any>;
  uiActions: UiActionsStart;
}

export const createDashboardContainer = (
  getStartServices: () => Promise<StartServices>
): EmbeddableFactoryDefinition<DashboardContainerInput, ContainerOutput> => {
  return {
    isContainerType: true,
    type: DASHBOARD_CONTAINER_TYPE,
    isEditable: async () => {
      const { capabilities } = await getStartServices();
      return !!capabilities.createNew && !!capabilities.showWriteControls;
    },

    getDisplayName: () => {
      return i18n.translate('dashboard.factory.displayName', {
        defaultMessage: 'dashboard',
      });
    },

    getDefaultInput: (): Partial<DashboardContainerInput> => {
      return {
        panels: {},
        isFullScreenMode: false,
        useMargins: true,
      };
    },

    create: async (
      initialInput: DashboardContainerInput,
      parent?: Container
    ): Promise<DashboardContainer | ErrorEmbeddable> => {
      const services = await getStartServices();
      return new DashboardContainer(initialInput, services, parent);
    },
  };
};

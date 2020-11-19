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
import { UiActionsStart } from 'src/plugins/ui_actions/public';
import { CoreStart, ScopedHistory } from 'src/core/public';
import { Start as InspectorStartContract } from 'src/plugins/inspector/public';
import { EmbeddableFactory, EmbeddableStart } from '../../../../embeddable/public';
import {
  ContainerOutput,
  EmbeddableFactoryDefinition,
  ErrorEmbeddable,
  Container,
} from '../../embeddable_plugin';
import { DashboardContainer, DashboardContainerInput } from './dashboard_container';
import { DASHBOARD_CONTAINER_TYPE } from './dashboard_constants';

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

export type DashboardContainerFactory = EmbeddableFactory<
  DashboardContainerInput,
  ContainerOutput,
  DashboardContainer
>;
export class DashboardContainerFactoryDefinition
  implements
    EmbeddableFactoryDefinition<DashboardContainerInput, ContainerOutput, DashboardContainer> {
  public readonly isContainerType = true;
  public readonly type = DASHBOARD_CONTAINER_TYPE;

  constructor(
    private readonly getStartServices: () => Promise<StartServices>,
    private getHistory: () => ScopedHistory
  ) {}

  public isEditable = async () => {
    const { capabilities } = await this.getStartServices();
    return !!capabilities.createNew && !!capabilities.showWriteControls;
  };

  public readonly getDisplayName = () => {
    return i18n.translate('dashboard.factory.displayName', {
      defaultMessage: 'dashboard',
    });
  };

  public getDefaultInput(): Partial<DashboardContainerInput> {
    return {
      panels: {},
      isEmbeddedExternally: false,
      isFullScreenMode: false,
      useMargins: true,
    };
  }

  public create = async (
    initialInput: DashboardContainerInput,
    parent?: Container
  ): Promise<DashboardContainer | ErrorEmbeddable> => {
    const services = await this.getStartServices();
    const stateTransfer = services.embeddable.getStateTransfer(this.getHistory());
    return new DashboardContainer(initialInput, services, stateTransfer, parent);
  };
}

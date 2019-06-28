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
import { SavedObjectMetaData } from 'ui/saved_objects/components/saved_object_finder';
import { SavedObjectAttributes } from 'target/types/server';
import {
  ContainerOutput,
  EmbeddableFactory,
  ErrorEmbeddable,
  Container,
  EmbeddableFactoryRegistry,
} from '../../../embeddable_api/public';
import { DashboardContainer, DashboardContainerInput } from './dashboard_container';

export const DASHBOARD_CONTAINER_TYPE = 'dashboard';

export class DashboardContainerFactory extends EmbeddableFactory<
  DashboardContainerInput,
  ContainerOutput
> {
  public readonly isContainerType = true;
  public readonly type = DASHBOARD_CONTAINER_TYPE;
  private allowEditing: boolean;

  constructor({
    savedObjectMetaData,
    capabilities,
  }: {
    savedObjectMetaData?: SavedObjectMetaData<SavedObjectAttributes>;
    capabilities: {
      showWriteControls: boolean;
      createNew: boolean;
    };
  }, private embeddableFactories: EmbeddableFactoryRegistry) {
    super({ savedObjectMetaData });
    this.allowEditing = capabilities.createNew && capabilities.showWriteControls;
  }

  public isEditable() {
    return this.allowEditing;
  }

  public getDisplayName() {
    return i18n.translate('dashboardEmbeddableContainer.factory.displayName', {
      defaultMessage: 'dashboard',
    });
  }

  public getDefaultInput(): Partial<DashboardContainerInput> {
    return {
      panels: {},
      isFullScreenMode: false,
      useMargins: true,
    };
  }

  public async create(
    initialInput: DashboardContainerInput,
    parent?: Container
  ): Promise<DashboardContainer | ErrorEmbeddable> {
    return new DashboardContainer(initialInput, this.embeddableFactories, parent);
  }
}

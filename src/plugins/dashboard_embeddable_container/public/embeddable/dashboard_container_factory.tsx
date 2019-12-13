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
import { SearchCollectorFactory } from 'src/plugins/data/public';
import { EmbeddableHandlers, IContainer } from 'src/plugins/embeddable/public';
import { SavedObjectAttributes } from '../../../../core/public';
import { SavedObjectMetaData } from '../types';
import { ContainerOutput, EmbeddableFactory, ErrorEmbeddable } from '../embeddable_plugin';
import {
  DashboardContainer,
  DashboardContainerInput,
  DashboardContainerOptions,
} from './dashboard_container';
import { DashboardCapabilities } from '../types';
import { DASHBOARD_CONTAINER_TYPE } from './dashboard_constants';

export interface DashboardOptions extends DashboardContainerOptions {
  savedObjectMetaData?: SavedObjectMetaData<SavedObjectAttributes>;
}

export class DashboardContainerFactory extends EmbeddableFactory<
  DashboardContainerInput,
  ContainerOutput
> {
  public readonly isContainerType = true;
  public readonly type = DASHBOARD_CONTAINER_TYPE;

  private readonly allowEditing: boolean;

  constructor(private readonly options: DashboardOptions) {
    super({
      savedObjectMetaData: options.savedObjectMetaData,
    });

    const capabilities = (options.application.capabilities
      .dashboard as unknown) as DashboardCapabilities;

    if (!capabilities || typeof capabilities !== 'object') {
      throw new TypeError('Dashboard capabilities not found.');
    }

    this.allowEditing = !!capabilities.createNew && !!capabilities.showWriteControls;
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
    parent?: IContainer
  ): Promise<DashboardContainer | ErrorEmbeddable> {
    return new DashboardContainer(initialInput, this.options, {
      createSearchCollector: this.createSearchCollector!,
      parent,
    });
  }
}

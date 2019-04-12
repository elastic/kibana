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

import {
  ContainerOutput,
  embeddableFactories,
  EmbeddableFactory,
  ErrorEmbeddable,
  Container,
} from 'plugins/embeddable_api/index';
import { DashboardContainer, DashboardContainerInput } from './dashboard_container';

export const DASHBOARD_CONTAINER_TYPE = 'dashboard';

export class DashboardContainerFactory extends EmbeddableFactory<
  DashboardContainerInput,
  ContainerOutput
> {
  constructor() {
    super({ name: DASHBOARD_CONTAINER_TYPE });
  }

  public getEditPath(panelId: string) {
    return '';
  }

  public getOutputSpec() {
    return {};
  }

  public getDefaultInputParameters(): Partial<DashboardContainerInput> {
    return {
      panels: {},
      isFullScreenMode: false,
      useMargins: true,
    };
  }

  /**
   *
   * @param panelMetadata. Currently just passing in panelState but it's more than we need, so we should
   * decouple this to only include data given to us from the embeddable when it's added to the dashboard. Generally
   * will be just the object id, but could be anything depending on the plugin.
   * @param onEmbeddableStateChanged
   * @return
   */
  public async create(
    initialInput: DashboardContainerInput,
    parent?: Container
  ): Promise<DashboardContainer | ErrorEmbeddable> {
    return Promise.resolve(new DashboardContainer(initialInput, embeddableFactories, parent));
  }
}

embeddableFactories.registerFactory(new DashboardContainerFactory());

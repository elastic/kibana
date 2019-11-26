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

import { PluginInitializerContext } from 'src/core/public';
import { EmbeddablePublicPlugin } from './plugin';

export {
  ADD_PANEL_ACTION_ID,
  APPLY_FILTER_ACTION,
  APPLY_FILTER_TRIGGER,
  PANEL_BADGE_TRIGGER,
  Adapters,
  AddPanelAction,
  CONTEXT_MENU_TRIGGER,
  Container,
  ContainerInput,
  ContainerOutput,
  EDIT_PANEL_ACTION_ID,
  EditPanelAction,
  Embeddable,
  EmbeddableChildPanel,
  EmbeddableChildPanelProps,
  EmbeddableFactory,
  EmbeddableFactoryNotFoundError,
  EmbeddableInput,
  EmbeddableInstanceConfiguration,
  EmbeddableOutput,
  EmbeddablePanel,
  ErrorEmbeddable,
  GetEmbeddableFactories,
  GetEmbeddableFactory,
  IContainer,
  IEmbeddable,
  OutputSpec,
  PanelNotFoundError,
  PanelState,
  PropertySpec,
  SavedObjectMetaData,
  ViewMode,
  isErrorEmbeddable,
  openAddPanelFlyout,
} from './lib';

export function plugin(initializerContext: PluginInitializerContext) {
  return new EmbeddablePublicPlugin(initializerContext);
}

export { IEmbeddableSetup, IEmbeddableStart } from './plugin';

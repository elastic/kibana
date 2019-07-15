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

import { Action, ActionContext } from './actions';
import { IEmbeddable } from './embeddables';
import { IContainer } from './containers';
import { EmbeddableFactory } from './embeddables/embeddable_factory';

export interface Trigger {
  id: string;
  title?: string;
  description?: string;
  actionIds: string[];
}

export interface PropertySpec {
  displayName: string;
  accessPath: string;
  id: string;
  description: string;
  value?: string;
}

export enum ViewMode {
  EDIT = 'edit',
  VIEW = 'view',
}

// import { Adapters } from 'ui/inspector';
// Inlining `Adapters` here as in NP platform we don't want to import from `src/legacy`.
// TODO: Figure out how to do this import in New Platform, maybe we don't need to
// TODO: import it at all as the type is too general.
export interface Adapters {
  [key: string]: any;
}

// import { SavedObjectMetaData } from 'ui/saved_objects/components/saved_object_finder';
// TODO: Figure out how to do this import in New Platform.
export interface SavedObjectMetaData<T> {
  type: string;
  name: string;
  getIconForSavedObject(savedObject: any): any;
  getTooltipForSavedObject?(savedObject: any): any;
  showSavedObject?(savedObject: any): any;
}

export interface TriggerContext {
  embeddable: IEmbeddable;
  container?: IContainer;
}

export type ExecuteTriggerActions = (
  triggerId: string,
  actionContext: ActionContext
) => Promise<void>;
export type GetActionsCompatibleWithTrigger = (
  triggerId: string,
  context: TriggerContext
) => Promise<Action[]>;
export type GetEmbeddableFactory = (id: string) => EmbeddableFactory | undefined;
export type GetEmbeddableFactories = () => IterableIterator<EmbeddableFactory>;

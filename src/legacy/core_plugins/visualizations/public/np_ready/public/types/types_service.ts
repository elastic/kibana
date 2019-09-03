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

/* eslint-disable @kbn/eslint/no-restricted-paths */
// @ts-ignore
import { visFactory } from 'ui/vis/vis_factory';
// @ts-ignore
import { DefaultEditorSize } from 'ui/vis/editor_size';
import * as types from 'ui/vis/vis';
/* eslint-enable @kbn/eslint/no-restricted-paths */

import { VisTypeAliasRegistry, VisTypeAlias } from './vis_type_alias_registry';

interface SetupDependencies {
  Vis: any;
  VisFactoryProvider: any;
  VisTypesRegistryProvider: any;
  defaultFeedbackMessage: any;
  visTypeAliasRegistry: VisTypeAliasRegistry;
}

/**
 * Vis Types Service
 *
 * @internal
 */
export class TypesService {
  public setup({
    Vis,
    VisFactoryProvider,
    VisTypesRegistryProvider,
    defaultFeedbackMessage,
    visTypeAliasRegistry,
  }: SetupDependencies) {
    return {
      Vis,
      VisFactoryProvider,
      VisTypesRegistryProvider,
      defaultFeedbackMessage, // make default in base vis type, or move?
      visTypeAliasRegistry,
    };
  }

  public stop() {
    // nothing to do here yet
  }
}

/** @public */
export type TypesSetup = ReturnType<TypesService['setup']>;

export { visFactory, DefaultEditorSize };

/** @public types */
export type VisTypeAlias = VisTypeAlias;
export type Vis = types.Vis;
export type VisParams = types.VisParams;
export type VisProvider = types.VisProvider;
export type VisState = types.VisState;
// todo: this breaks it // export { VisualizationController, VisType } from 'ui/vis/vis_types/vis_type';
export { VisTypesRegistry } from 'ui/registry/vis_types';
export { Status } from 'ui/vis/update_status';

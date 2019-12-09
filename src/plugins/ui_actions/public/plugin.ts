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

import { CoreStart, PluginInitializerContext, CoreSetup, Plugin } from 'src/core/public';
import { IUiActionsApi, IActionRegistry, ITriggerRegistry } from './types';
import { createApi } from './api';

export interface IUiActionsSetup {
  attachAction: IUiActionsApi['attachAction'];
  detachAction: IUiActionsApi['detachAction'];
  registerAction: IUiActionsApi['registerAction'];
  registerTrigger: IUiActionsApi['registerTrigger'];
}

export type IUiActionsStart = IUiActionsApi;

export class UiActionsPlugin implements Plugin<IUiActionsSetup, IUiActionsStart> {
  private readonly triggers: ITriggerRegistry = new Map();
  private readonly actions: IActionRegistry = new Map();
  private api!: IUiActionsApi;

  constructor(initializerContext: PluginInitializerContext) {
    this.api = createApi({ triggers: this.triggers, actions: this.actions }).api;
  }

  public setup(core: CoreSetup): IUiActionsSetup {
    return {
      registerTrigger: this.api.registerTrigger,
      registerAction: this.api.registerAction,
      attachAction: this.api.attachAction,
      detachAction: this.api.detachAction,
    };
  }

  public start(core: CoreStart): IUiActionsStart {
    return this.api;
  }

  public stop() {
    this.actions.clear();
    this.triggers.clear();
  }
}

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

import { CoreStart, CoreSetup, Plugin, PluginInitializerContext } from 'src/core/public';
import { UiActionsService } from './service';

export type UiActionsSetup = Pick<
  UiActionsService,
  'attachAction' | 'detachAction' | 'registerAction' | 'registerTrigger'
>;

export type UiActionsStart = PublicMethodsOf<UiActionsService>;

export class UiActionsPlugin implements Plugin<UiActionsSetup, UiActionsStart> {
  private readonly service = new UiActionsService();

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup): UiActionsSetup {
    return this.service;
  }

  public start(core: CoreStart): UiActionsStart {
    return this.service;
  }

  public stop() {
    this.service.clear();
  }
}

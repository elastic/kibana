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

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '../../../core/public';
import { InspectorViewRegistry } from './view_registry';
import { Adapters } from './types';

export interface Setup {
  registerView: InspectorViewRegistry['register'];

  __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: {
    views: InspectorViewRegistry;
  };
}

export interface Start {
  /**
   * Checks if a inspector panel could be shown based on the passed adapters.
   *
   * @param {object} adapters - An object of adapters. This should be the same
   *    you would pass into `open`.
   * @returns {boolean} True, if a call to `open` with the same adapters
   *    would have shown the inspector panel, false otherwise.
   */
  isAvailable: (adapters?: Adapters) => boolean;
}

export class InspectorPublicPlugin implements Plugin<Setup, Start> {
  views: InspectorViewRegistry | undefined;

  constructor(initializerContext: PluginInitializerContext) {}

  public async setup(core: CoreSetup) {
    this.views = new InspectorViewRegistry();

    return {
      registerView: this.views!.register.bind(this.views),

      __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: {
        views: this.views,
      },
    };
  }

  public start(core: CoreStart) {
    const isAvailable: Start['isAvailable'] = adapters =>
      this.views!.getVisible(adapters).length > 0;

    return {
      isAvailable,
    };
  }

  public stop() {}
}

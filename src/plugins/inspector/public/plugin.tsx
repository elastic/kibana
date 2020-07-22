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
import * as React from 'react';
import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '../../../core/public';
import { toMountPoint } from '../../kibana_react/public';
import { InspectorViewRegistry } from './view_registry';
import { Adapters, InspectorOptions, InspectorSession } from './types';
import { InspectorPanel } from './ui/inspector_panel';

import { getRequestsViewDescription, getDataViewDescription } from './views';

export interface Setup {
  registerView: InspectorViewRegistry['register'];

  __LEGACY: {
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

  /**
   * Opens the inspector panel for the given adapters and close any previously opened
   * inspector panel. The previously panel will be closed also if no new panel will be
   * opened (e.g. because of the passed adapters no view is available). You can use
   * {@link InspectorSession#close} on the return value to close that opened panel again.
   *
   * @param {object} adapters - An object of adapters for which you want to show
   *    the inspector panel.
   * @param {InspectorOptions} options - Options that configure the inspector. See InspectorOptions type.
   * @return {InspectorSession} The session instance for the opened inspector.
   * @throws {Error}
   */
  open: (adapters: Adapters, options?: InspectorOptions) => InspectorSession;
}

export class InspectorPublicPlugin implements Plugin<Setup, Start> {
  views: InspectorViewRegistry | undefined;

  constructor(initializerContext: PluginInitializerContext) {}

  public async setup(core: CoreSetup) {
    this.views = new InspectorViewRegistry();

    this.views.register(getDataViewDescription(core.uiSettings));
    this.views.register(getRequestsViewDescription());

    return {
      registerView: this.views!.register.bind(this.views),

      __LEGACY: {
        views: this.views,
      },
    };
  }

  public start(core: CoreStart) {
    const isAvailable: Start['isAvailable'] = (adapters) =>
      this.views!.getVisible(adapters).length > 0;

    const closeButtonLabel = i18n.translate('inspector.closeButton', {
      defaultMessage: 'Close Inspector',
    });

    const open: Start['open'] = (adapters, options = {}) => {
      const views = this.views!.getVisible(adapters);

      // Don't open inspector if there are no views available for the passed adapters
      if (!views || views.length === 0) {
        throw new Error(`Tried to open an inspector without views being available.
          Make sure to call Inspector.isAvailable() with the same adapters before to check
          if an inspector can be shown.`);
      }

      return core.overlays.openFlyout(
        toMountPoint(<InspectorPanel views={views} adapters={adapters} title={options.title} />),
        {
          'data-test-subj': 'inspectorPanel',
          closeButtonAriaLabel: closeButtonLabel,
        }
      );
    };

    return {
      isAvailable,
      open,
    };
  }

  public stop() {}
}

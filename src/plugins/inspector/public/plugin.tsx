/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import * as React from 'react';
import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '../../../core/public';
import { toMountPoint } from '../../kibana_react/public';
import { SharePluginStart } from '../../share/public';
import { InspectorViewRegistry } from './view_registry';
import { InspectorOptions, InspectorSession } from './types';
import { InspectorPanel } from './ui/inspector_panel';
import { Adapters } from '../common';

import { getRequestsViewDescription } from './views';

export interface InspectorPluginStartDeps {
  share: SharePluginStart;
}

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

  public setup(core: CoreSetup) {
    this.views = new InspectorViewRegistry();

    this.views.register(getRequestsViewDescription());

    return {
      registerView: this.views!.register.bind(this.views),

      __LEGACY: {
        views: this.views,
      },
    };
  }

  public start(core: CoreStart, startDeps: InspectorPluginStartDeps) {
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
        toMountPoint(
          <InspectorPanel
            views={views}
            adapters={adapters}
            title={options.title}
            options={options.options}
            dependencies={{
              application: core.application,
              http: core.http,
              uiSettings: core.uiSettings,
              share: startDeps.share,
            }}
          />,
          { theme$: core.theme.theme$ }
        ),
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

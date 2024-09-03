/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { PANEL_HOVER_TRIGGER } from '@kbn/embeddable-plugin/public';

import { controlsService } from './services/controls/controls_service';
import {
  ControlsPluginSetup,
  ControlsPluginSetupDeps,
  ControlsPluginStart,
  ControlsPluginStartDeps,
} from './types';

export class ControlsPlugin
  implements
    Plugin<
      ControlsPluginSetup,
      ControlsPluginStart,
      ControlsPluginSetupDeps,
      ControlsPluginStartDeps
    >
{
  private async startControlsKibanaServices(
    coreStart: CoreStart,
    startPlugins: ControlsPluginStartDeps
  ) {
    const { registry, pluginServices } = await import('./services/plugin_services');
    pluginServices.setRegistry(registry.start({ coreStart, startPlugins }));
  }

  public setup(
    _coreSetup: CoreSetup<ControlsPluginStartDeps, ControlsPluginStart>,
    _setupPlugins: ControlsPluginSetupDeps
  ): ControlsPluginSetup {
    const { registerControlType } = controlsService;

    return {
      registerControlType, // TODO: Delete
    };
  }

  public start(coreStart: CoreStart, startPlugins: ControlsPluginStartDeps): ControlsPluginStart {
    this.startControlsKibanaServices(coreStart, startPlugins).then(async () => {
      const { uiActions } = startPlugins;

      const [{ DeleteControlAction }, { EditControlAction }, { ClearControlAction }] =
        await Promise.all([
          import('./actions/delete_control_action'),
          import('./actions/edit_control_action'),
          import('./actions/clear_control_action'),
        ]);

      const deleteControlAction = new DeleteControlAction();
      uiActions.registerAction(deleteControlAction);
      uiActions.attachAction(PANEL_HOVER_TRIGGER, deleteControlAction.id);

      const editControlAction = new EditControlAction();
      uiActions.registerAction(editControlAction);
      uiActions.attachAction(PANEL_HOVER_TRIGGER, editControlAction.id);

      const clearControlAction = new ClearControlAction();
      uiActions.registerAction(clearControlAction);
      uiActions.attachAction(PANEL_HOVER_TRIGGER, clearControlAction.id);
    });

    const { getControlFactory, getControlTypes } = controlsService;
    return {
      getControlFactory,
      getControlTypes,
    };
  }

  public stop() {}
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { PANEL_HOVER_TRIGGER } from '@kbn/embeddable-plugin/public';

import { registerControlGroupEmbeddable } from './react_controls/control_group/register_control_group_embeddable';
import { registerOptionsListControl } from './react_controls/controls/data_controls/options_list_control/register_options_list_control';
import { registerRangeSliderControl } from './react_controls/controls/data_controls/range_slider/register_range_slider_control';
import { registerTimeSliderControl } from './react_controls/controls/timeslider_control/register_timeslider_control';
import type { ControlsPluginSetupDeps, ControlsPluginStartDeps } from './types';
import { setKibanaServices, untilPluginStartServicesReady } from './services/kibana_services';

export class ControlsPlugin
  implements Plugin<void, void, ControlsPluginSetupDeps, ControlsPluginStartDeps>
{
  public setup(
    _coreSetup: CoreSetup<ControlsPluginStartDeps>,
    _setupPlugins: ControlsPluginSetupDeps
  ) {
    const { embeddable } = _setupPlugins;

    registerControlGroupEmbeddable(embeddable);
    registerOptionsListControl(_coreSetup);
    registerRangeSliderControl(_coreSetup);
    registerTimeSliderControl(_coreSetup);
  }

  public start(coreStart: CoreStart, startPlugins: ControlsPluginStartDeps) {
    const { uiActions } = startPlugins;
    setKibanaServices(coreStart, startPlugins);

    Promise.all([
      untilPluginStartServicesReady(),
      import('./actions/delete_control_action'),
      import('./actions/edit_control_action'),
      import('./actions/clear_control_action'),
    ]).then(([_, { DeleteControlAction }, { EditControlAction }, { ClearControlAction }]) => {
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
  }

  public stop() {}
}

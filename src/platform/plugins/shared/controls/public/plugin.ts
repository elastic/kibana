/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQL_CONTROL, OPTIONS_LIST_CONTROL, RANGE_SLIDER_CONTROL } from '@kbn/controls-constants';
import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { PanelPlacementStrategy } from '@kbn/presentation-util-plugin/public';

import { registerActions } from './actions/register_actions';
import { registerOptionsListControl } from './controls/data_controls/options_list_control/register_options_list_control';
import { registerRangeSliderControl } from './controls/data_controls/range_slider/register_range_slider_control';
import { registerESQLControl } from './controls/esql_control/register_esql_control';
import { registerTimeSliderControl } from './controls/timeslider_control/register_timeslider_control';
import { setKibanaServices } from './services/kibana_services';
import type { ControlsPluginSetupDeps, ControlsPluginStartDeps } from './types';

const CONTROL_PANEL_PLACEMENT = {
  placementSettings: { width: 12, height: 2, strategy: PanelPlacementStrategy.placeAtTop },
  resizeSettings: { maxHeight: 2, minHeight: 2 },
};

export class ControlsPlugin
  implements Plugin<void, void, ControlsPluginSetupDeps, ControlsPluginStartDeps>
{
  public setup(
    _coreSetup: CoreSetup<ControlsPluginStartDeps>,
    _setupPlugins: ControlsPluginSetupDeps
  ) {
    const { embeddable } = _setupPlugins;

    registerOptionsListControl(embeddable);
    registerRangeSliderControl(embeddable);
    registerTimeSliderControl(embeddable);
    registerESQLControl(embeddable);
  }

  public start(coreStart: CoreStart, startPlugins: ControlsPluginStartDeps) {
    setKibanaServices(coreStart, startPlugins);
    registerActions(startPlugins.uiActions);

    startPlugins.presentationUtil.registerPanelPlacementSettings(OPTIONS_LIST_CONTROL, () => {
      return CONTROL_PANEL_PLACEMENT;
    });
    startPlugins.presentationUtil.registerPanelPlacementSettings(RANGE_SLIDER_CONTROL, () => {
      return CONTROL_PANEL_PLACEMENT;
    });
    startPlugins.presentationUtil.registerPanelPlacementSettings(ESQL_CONTROL, () => {
      return CONTROL_PANEL_PLACEMENT;
    });
  }

  public stop() {}
}

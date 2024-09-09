/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { EmbeddableFactory, PANEL_HOVER_TRIGGER } from '@kbn/embeddable-plugin/public';

import {
  ControlGroupContainerFactory,
  CONTROL_GROUP_TYPE,
  OPTIONS_LIST_CONTROL,
  RANGE_SLIDER_CONTROL,
  TIME_SLIDER_CONTROL,
} from '.';
import { OptionsListEmbeddableFactory, OptionsListEmbeddableInput } from './options_list';
import { RangeSliderEmbeddableFactory, RangeSliderEmbeddableInput } from './range_slider';
import { TimeSliderEmbeddableFactory, TimeSliderControlEmbeddableInput } from './time_slider';
import { controlsService } from './services/controls/controls_service';
import {
  ControlsPluginSetup,
  ControlsPluginStart,
  ControlsPluginSetupDeps,
  ControlsPluginStartDeps,
  IEditableControlFactory,
  ControlInput,
} from './types';
import { registerControlGroupEmbeddable } from './react_controls/control_group/register_control_group_embeddable';
import { registerOptionsListControl } from './react_controls/controls/data_controls/options_list_control/register_options_list_control';
import { registerRangeSliderControl } from './react_controls/controls/data_controls/range_slider/register_range_slider_control';
import { registerTimeSliderControl } from './react_controls/controls/timeslider_control/register_timeslider_control';
import { EditControlAction } from './react_controls/actions/edit_control_action/edit_control_action';
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

  private transferEditorFunctions<I extends ControlInput = ControlInput>(
    factoryDef: IEditableControlFactory<I>,
    factory: EmbeddableFactory
  ) {
    (factory as IEditableControlFactory<I>).controlEditorOptionsComponent =
      factoryDef.controlEditorOptionsComponent ?? undefined;
    (factory as IEditableControlFactory<I>).presaveTransformFunction =
      factoryDef.presaveTransformFunction;
    (factory as IEditableControlFactory<I>).isFieldCompatible = factoryDef.isFieldCompatible;
  }

  public setup(
    _coreSetup: CoreSetup<ControlsPluginStartDeps, ControlsPluginStart>,
    _setupPlugins: ControlsPluginSetupDeps
  ): ControlsPluginSetup {
    const { registerControlType } = controlsService;
    const { embeddable } = _setupPlugins;

    registerControlGroupEmbeddable(_coreSetup, embeddable);
    registerOptionsListControl(_coreSetup);
    registerRangeSliderControl(_coreSetup);
    registerTimeSliderControl(_coreSetup);

    // register control group embeddable factory
    _coreSetup.getStartServices().then(([, deps]) => {
      embeddable.registerEmbeddableFactory(
        CONTROL_GROUP_TYPE,
        new ControlGroupContainerFactory(deps.embeddable)
      );

      // Options List control factory setup
      const optionsListFactoryDef = new OptionsListEmbeddableFactory();
      const optionsListFactory = embeddable.registerEmbeddableFactory(
        OPTIONS_LIST_CONTROL,
        optionsListFactoryDef
      )();
      this.transferEditorFunctions<OptionsListEmbeddableInput>(
        optionsListFactoryDef,
        optionsListFactory
      );
      registerControlType(optionsListFactory);

      // Register range slider
      const rangeSliderFactoryDef = new RangeSliderEmbeddableFactory();
      const rangeSliderFactory = embeddable.registerEmbeddableFactory(
        RANGE_SLIDER_CONTROL,
        rangeSliderFactoryDef
      )();
      this.transferEditorFunctions<RangeSliderEmbeddableInput>(
        rangeSliderFactoryDef,
        rangeSliderFactory
      );
      registerControlType(rangeSliderFactory);

      const timeSliderFactoryDef = new TimeSliderEmbeddableFactory();
      const timeSliderFactory = embeddable.registerEmbeddableFactory(
        TIME_SLIDER_CONTROL,
        timeSliderFactoryDef
      )();
      this.transferEditorFunctions<TimeSliderControlEmbeddableInput>(
        timeSliderFactoryDef,
        timeSliderFactory
      );
      registerControlType(timeSliderFactory);
    });

    return {
      registerControlType,
    };
  }

  public start(coreStart: CoreStart, startPlugins: ControlsPluginStartDeps): ControlsPluginStart {
    this.startControlsKibanaServices(coreStart, startPlugins).then(async () => {
      const { uiActions } = startPlugins;

      const { DeleteControlAction } = await import('./control_group/actions/delete_control_action');
      const deleteControlAction = new DeleteControlAction();
      uiActions.registerAction(deleteControlAction);
      uiActions.attachAction(PANEL_HOVER_TRIGGER, deleteControlAction.id);

      const editControlAction = new EditControlAction();
      uiActions.registerAction(editControlAction);
      uiActions.attachAction(PANEL_HOVER_TRIGGER, editControlAction.id);

      /**
       * TODO: Remove edit legacy control embeddable action when embeddable controls are removed
       */
      const { EditLegacyEmbeddableControlAction } = await import(
        './control_group/actions/edit_control_action'
      );
      const editLegacyEmbeddableControlAction = new EditLegacyEmbeddableControlAction(
        deleteControlAction
      );
      uiActions.registerAction(editLegacyEmbeddableControlAction);
      uiActions.attachAction(PANEL_HOVER_TRIGGER, editLegacyEmbeddableControlAction.id);

      const { ClearControlAction } = await import('./control_group/actions/clear_control_action');
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { EmbeddableFactory } from '@kbn/embeddable-plugin/public';

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
    this.startControlsKibanaServices(coreStart, startPlugins);

    const { getControlFactory, getControlTypes } = controlsService;

    return {
      getControlFactory,
      getControlTypes,
    };
  }

  public stop() {}
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '../../../core/public';
import { pluginServices } from './services';
import {
  ControlsPluginSetup,
  ControlsPluginStart,
  ControlsPluginSetupDeps,
  ControlsPluginStartDeps,
  IEditableControlFactory,
  ControlInput,
} from './types';
import {
  OptionsListEmbeddableFactory,
  OptionsListEmbeddableInput,
} from './control_types/options_list';
import {
  RangeSliderEmbeddableFactory,
  RangeSliderEmbeddableInput,
} from './control_types/range_slider';
import {
  ControlGroupContainerFactory,
  CONTROL_GROUP_TYPE,
  OPTIONS_LIST_CONTROL,
  RANGE_SLIDER_CONTROL,
} from '.';
import { controlsService } from './services/kibana/controls';
import { EmbeddableFactory } from '../../embeddable/public';

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
    const { registry } = await import('./services/kibana');
    pluginServices.setRegistry(registry.start({ coreStart, startPlugins }));
  }

  private transferEditorFunctions<I extends ControlInput = ControlInput>(
    factoryDef: IEditableControlFactory<I>,
    factory: EmbeddableFactory
  ) {
    (factory as IEditableControlFactory<I>).controlEditorComponent =
      factoryDef.controlEditorComponent;
    (factory as IEditableControlFactory<I>).presaveTransformFunction =
      factoryDef.presaveTransformFunction;
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

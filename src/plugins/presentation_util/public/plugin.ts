/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '../../../core/public';
import { pluginServices } from './services';
import { registry } from './services/kibana';
import {
  PresentationUtilPluginSetupDeps,
  PresentationUtilPluginStartDeps,
  ControlGroupContainerFactory,
  PresentationUtilPluginSetup,
  PresentationUtilPluginStart,
  GetControlEditorComponent,
  OPTIONS_LIST_CONTROL,
  CONTROL_GROUP_TYPE,
  IEditableControlFactory,
} from './types';
import { OptionsListEmbeddableFactory } from './components/controls/control_types/options_list';

export class PresentationUtilPlugin
  implements
    Plugin<
      PresentationUtilPluginSetup,
      PresentationUtilPluginStart,
      PresentationUtilPluginSetupDeps,
      PresentationUtilPluginStartDeps
    >
{
  private inlineEditors: { [key: string]: GetControlEditorComponent | undefined } = {};

  public setup(
    _coreSetup: CoreSetup<PresentationUtilPluginSetup>,
    _setupPlugins: PresentationUtilPluginSetupDeps
  ): PresentationUtilPluginSetup {
    const { embeddable } = _setupPlugins;

    // register control group embeddable factory
    embeddable.registerEmbeddableFactory(CONTROL_GROUP_TYPE, new ControlGroupContainerFactory());

    // create control type embeddable factories.
    const optionsListFactory = new OptionsListEmbeddableFactory();
    this.inlineEditors[OPTIONS_LIST_CONTROL] = (
      optionsListFactory as IEditableControlFactory
    ).getControlEditor;
    embeddable.registerEmbeddableFactory(OPTIONS_LIST_CONTROL, optionsListFactory);

    return {};
  }

  public start(
    coreStart: CoreStart,
    startPlugins: PresentationUtilPluginStartDeps
  ): PresentationUtilPluginStart {
    pluginServices.setRegistry(registry.start({ coreStart, startPlugins }));
    const { controls: controlsService } = pluginServices.getServices();
    const { embeddable } = startPlugins;

    // register control types with controls service.
    const optionsListFactory = embeddable.getEmbeddableFactory(OPTIONS_LIST_CONTROL);
    // Temporarily pass along inline editors - inline editing should be made a first-class feature of embeddables
    (optionsListFactory as IEditableControlFactory).getControlEditor =
      this.inlineEditors[OPTIONS_LIST_CONTROL];
    if (optionsListFactory) controlsService.registerControlType(optionsListFactory);

    return {
      ContextProvider: pluginServices.getContextProvider(),
      controlsService,
      labsService: pluginServices.getServices().labs,
    };
  }

  public stop() {}
}

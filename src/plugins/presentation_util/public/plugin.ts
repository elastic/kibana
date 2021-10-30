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
  IEditableControlFactory,
  ControlEditorProps,
  ControlInput,
  ControlEmbeddable,
} from './types';
import { OptionsListEmbeddableFactory } from './components/controls/control_types/options_list';
import { CONTROL_GROUP_TYPE, OPTIONS_LIST_CONTROL } from '.';

export class PresentationUtilPlugin
  implements
    Plugin<
      PresentationUtilPluginSetup,
      PresentationUtilPluginStart,
      PresentationUtilPluginSetupDeps,
      PresentationUtilPluginStartDeps
    >
{
  private inlineEditors: {
    [key: string]: {
      controlEditorComponent?: (props: ControlEditorProps) => JSX.Element;
      presaveTransformFunction?: (
        newInput: Partial<ControlInput>,
        embeddable?: ControlEmbeddable
      ) => Partial<ControlInput>;
    };
  } = {};

  public setup(
    _coreSetup: CoreSetup<PresentationUtilPluginStartDeps, PresentationUtilPluginStart>,
    _setupPlugins: PresentationUtilPluginSetupDeps
  ): PresentationUtilPluginSetup {
    _coreSetup.getStartServices().then(([coreStart, deps]) => {
      // register control group embeddable factory
      embeddable.registerEmbeddableFactory(
        CONTROL_GROUP_TYPE,
        new ControlGroupContainerFactory(deps.embeddable)
      );
    });

    const { embeddable } = _setupPlugins;

    // create control type embeddable factories.
    const optionsListFactory = new OptionsListEmbeddableFactory();
    const editableOptionsListFactory = optionsListFactory as IEditableControlFactory;
    this.inlineEditors[OPTIONS_LIST_CONTROL] = {
      controlEditorComponent: editableOptionsListFactory.controlEditorComponent,
      presaveTransformFunction: editableOptionsListFactory.presaveTransformFunction,
    };
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
    const editableOptionsListFactory = optionsListFactory as IEditableControlFactory;
    const {
      controlEditorComponent: optionsListControlEditor,
      presaveTransformFunction: optionsListPresaveTransform,
    } = this.inlineEditors[OPTIONS_LIST_CONTROL];
    editableOptionsListFactory.controlEditorComponent = optionsListControlEditor;
    editableOptionsListFactory.presaveTransformFunction = optionsListPresaveTransform;

    if (optionsListFactory) controlsService.registerControlType(optionsListFactory);

    return {
      ContextProvider: pluginServices.getContextProvider(),
      controlsService,
      labsService: pluginServices.getServices().labs,
    };
  }

  public stop() {}
}

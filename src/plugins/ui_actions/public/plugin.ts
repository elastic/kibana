/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart, CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { PublicMethodsOf } from '@kbn/utility-types';
import { UiActionsService } from './service';
import { rowClickTrigger, visualizeFieldTrigger, visualizeGeoFieldTrigger } from './triggers';
import { setTheme } from './services';

export type UiActionsSetup = Pick<
  UiActionsService,
  | 'addTriggerAction'
  | 'attachAction'
  | 'detachAction'
  | 'registerAction'
  | 'registerTrigger'
  | 'unregisterAction'
>;

export type UiActionsStart = PublicMethodsOf<UiActionsService>;

export class UiActionsPlugin implements Plugin<UiActionsSetup, UiActionsStart> {
  private readonly service = new UiActionsService();

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup): UiActionsSetup {
    setTheme(core.theme);
    this.service.registerTrigger(rowClickTrigger);
    this.service.registerTrigger(visualizeFieldTrigger);
    this.service.registerTrigger(visualizeGeoFieldTrigger);
    return this.service;
  }

  public start(core: CoreStart): UiActionsStart {
    return this.service;
  }

  public stop() {
    this.service.clear();
  }
}

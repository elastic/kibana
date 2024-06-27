/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart, CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/public';
import { PublicMethodsOf } from '@kbn/utility-types';
import {
  rowClickTrigger,
  visualizeFieldTrigger,
  visualizeGeoFieldTrigger,
  addPanelMenuTrigger,
} from '@kbn/ui-actions-browser/src/triggers';
import { UiActionsService } from './service';
import { setAnalytics, setI18n, setTheme } from './services';

export type UiActionsPublicSetup = Pick<
  UiActionsService,
  | 'addTriggerAction'
  | 'attachAction'
  | 'detachAction'
  | 'registerAction'
  | 'registerTrigger'
  | 'unregisterAction'
>;

export type UiActionsPublicStart = PublicMethodsOf<UiActionsService>;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UiActionsPublicSetupDependencies {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UiActionsPublicStartDependencies {}

export class UiActionsPlugin
  implements
    Plugin<
      UiActionsPublicSetup,
      UiActionsPublicStart,
      UiActionsPublicSetupDependencies,
      UiActionsPublicStartDependencies
    >
{
  private readonly service = new UiActionsService();

  constructor(_initializerContext: PluginInitializerContext) {}

  public setup(_core: CoreSetup): UiActionsPublicSetup {
    this.service.registerTrigger(addPanelMenuTrigger);
    this.service.registerTrigger(rowClickTrigger);
    this.service.registerTrigger(visualizeFieldTrigger);
    this.service.registerTrigger(visualizeGeoFieldTrigger);
    return this.service;
  }

  public start(core: CoreStart): UiActionsPublicStart {
    setAnalytics(core.analytics);
    setI18n(core.i18n);
    setTheme(core.theme);
    return this.service;
  }

  public stop() {
    this.service.clear();
  }
}

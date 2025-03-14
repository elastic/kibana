/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
import { setAnalytics, setI18n, setNotifications, setTheme, setUserProfile } from './services';

export type UiActionsPublicSetup = Pick<
  UiActionsService,
  | 'addTriggerAction'
  | 'addTriggerActionAsync'
  | 'attachAction'
  | 'detachAction'
  | 'registerAction'
  | 'registerActionAsync'
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
    setNotifications(core.notifications);
    setTheme(core.theme);
    setUserProfile(core.userProfile);
    return this.service;
  }

  public stop() {
    this.service.clear();
  }
}

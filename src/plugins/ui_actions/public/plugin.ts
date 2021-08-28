/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { CoreSetup, CoreStart } from '../../../core/public/types';
import type { Plugin } from '../../../core/public/plugins/plugin';
import type { PluginInitializerContext } from '../../../core/public/plugins/plugin_context';
import { UiActionsService } from './service/ui_actions_service';
import { rowClickTrigger } from './triggers/row_click_trigger';
import { visualizeFieldTrigger } from './triggers/visualize_field_trigger';
import { visualizeGeoFieldTrigger } from './triggers/visualize_geo_field_trigger';

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

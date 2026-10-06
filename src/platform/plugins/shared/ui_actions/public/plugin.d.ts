/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart, CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { UiActionsService } from './service';
export type UiActionsPublicSetup = Pick<
  UiActionsService,
  | 'addTriggerActionAsync'
  | 'attachAction'
  | 'detachAction'
  | 'registerActionAsync'
  | 'unregisterAction'
>;
export type UiActionsPublicStart = PublicMethodsOf<UiActionsService>;
export interface UiActionsPublicSetupDependencies {}
export interface UiActionsPublicStartDependencies {}
export declare class UiActionsPlugin
  implements
    Plugin<
      UiActionsPublicSetup,
      UiActionsPublicStart,
      UiActionsPublicSetupDependencies,
      UiActionsPublicStartDependencies
    >
{
  private readonly service;
  constructor(_initializerContext: PluginInitializerContext);
  setup(_core: CoreSetup): UiActionsPublicSetup;
  start(core: CoreStart): UiActionsPublicStart;
  stop(): void;
}

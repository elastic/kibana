/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
export type KibanaUtilsPublicSetup = undefined;
export type KibanaUtilsPublicStart = undefined;
export interface KibanaUtilsPublicSetupDependencies {}
export interface KibanaUtilsPublicStartDependencies {}
export declare class KibanaUtilsPublicPlugin
  implements
    Plugin<
      KibanaUtilsPublicSetup,
      KibanaUtilsPublicStart,
      KibanaUtilsPublicSetupDependencies,
      KibanaUtilsPublicStartDependencies
    >
{
  setup(_core: CoreSetup): KibanaUtilsPublicSetup;
  start(_core: CoreStart): KibanaUtilsPublicStart;
  stop(): void;
}

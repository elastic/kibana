/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';

export type KibanaUtilsPublicSetup = undefined;

export type KibanaUtilsPublicStart = undefined;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface KibanaUtilsPublicSetupDependencies {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface KibanaUtilsPublicStartDependencies {}

export class KibanaUtilsPublicPlugin
  implements
    Plugin<
      KibanaUtilsPublicSetup,
      KibanaUtilsPublicStart,
      KibanaUtilsPublicSetupDependencies,
      KibanaUtilsPublicStartDependencies
    >
{
  public setup(_core: CoreSetup): KibanaUtilsPublicSetup {
    return undefined;
  }

  public start(_core: CoreStart): KibanaUtilsPublicStart {
    return undefined;
  }

  public stop() {}
}

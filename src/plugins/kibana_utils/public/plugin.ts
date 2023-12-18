/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { History } from 'history';
import { setVersion } from './set_version';

export interface KibanaUtilsPublicSetup {
  setVersion: (history: Pick<History, 'location' | 'replace'>) => void;
}

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
  private readonly version: string;

  constructor(initializerContext: PluginInitializerContext) {
    this.version = initializerContext.env.packageInfo.version;
  }

  public setup(_core: CoreSetup): KibanaUtilsPublicSetup {
    return {
      setVersion: this.setVersion,
    };
  }

  public start(_core: CoreStart): KibanaUtilsPublicStart {
    return undefined;
  }

  public stop() {}

  private setVersion = (history: Pick<History, 'location' | 'replace'>) => {
    setVersion(history, this.version);
  };
}

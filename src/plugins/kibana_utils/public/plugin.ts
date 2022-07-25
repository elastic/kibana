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

export interface KibanaUtilsSetup {
  setVersion: (history: Pick<History, 'location' | 'replace'>) => void;
}

export type KibanaUtilsStart = undefined;

export class KibanaUtilsPublicPlugin implements Plugin<KibanaUtilsSetup, KibanaUtilsStart> {
  private readonly version: string;

  constructor(initializerContext: PluginInitializerContext) {
    this.version = initializerContext.env.packageInfo.version;
  }

  public setup(core: CoreSetup): KibanaUtilsSetup {
    return {
      setVersion: this.setVersion,
    };
  }

  public start(core: CoreStart): KibanaUtilsStart {
    return undefined;
  }

  public stop() {}

  private setVersion = (history: Pick<History, 'location' | 'replace'>) => {
    setVersion(history, this.version);
  };
}

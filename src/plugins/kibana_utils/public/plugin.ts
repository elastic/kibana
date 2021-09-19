/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  ScopedHistory,
} from 'src/core/public';
import { History } from 'history';

export interface KibanaUtilsSetup {
  setVersion: (history: ScopedHistory) => void;
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
    const search = new URLSearchParams(history.location.search);
    if (search.get('_v') === this.version) return;
    search.set('_v', this.version);
    const path =
      history.location.pathname +
      '?' +
      search.toString() +
      (history.location.hash ? '#' : history.location.hash);
    history.replace(path);
  };
}

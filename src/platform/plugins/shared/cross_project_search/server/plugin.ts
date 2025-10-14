/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';

import type {
  CrossProjectSearchServerSetup,
  CrossProjectSearchServerStart,
} from './types';
import { CrossProjectSearchConfig } from './config';
import { Observable, firstValueFrom } from 'rxjs';

export interface CrossProjectSearchSetup {
  cpsEnabled: boolean;
};

export class CrossProjectSearchPlugin
  implements
    Plugin<
      CrossProjectSearchServerSetup,
      CrossProjectSearchServerStart
    >
{

private readonly config$: Observable<CrossProjectSearchConfig>;

  constructor(initializerContext: PluginInitializerContext<CrossProjectSearchConfig>) {
    this.config$ = initializerContext.config.create();
  }

  public async setup(core: CoreSetup) {
    const config = await firstValueFrom(this.config$);

    if (config.cpsEnabled) {
      console.log('CPS is enabled');
    } else {
      console.log('CPS is disabled');
    }

    return {
        cpsEnabled: config.cpsEnabled,
    };
  }

  public start(_core: CoreStart) {
    return {};
  }

  public stop() {}
}

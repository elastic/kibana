/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';

import { UserContentPluginSetup, UserContentPluginStart } from './types';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SetupDependencies {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface StartDependencies {}

export class UserContentPlugin implements Plugin<UserContentPluginSetup, UserContentPluginStart> {
  constructor() {}

  public setup(core: CoreSetup, deps: SetupDependencies): UserContentPluginSetup {
    return {};
  }

  public start(core: CoreStart, deps: StartDependencies) {
    return {
      ui: {
        components: {},
      },
    };
  }
}

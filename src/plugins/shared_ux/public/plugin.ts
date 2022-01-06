/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '../../../core/public';
import { SharedUXPluginSetup, SharedUXPluginStart } from './types';

export class SharedUXPlugin implements Plugin<SharedUXPluginSetup, SharedUXPluginStart> {
  public setup(_core: CoreSetup): SharedUXPluginSetup {
    return {};
  }

  public start(_core: CoreStart): SharedUXPluginStart {
    return {};
  }

  public stop() {}
}

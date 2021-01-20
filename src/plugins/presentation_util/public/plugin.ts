/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from '../../../core/public';
import { PresentationUtilPluginSetup, PresentationUtilPluginStart } from './types';

export class PresentationUtilPlugin
  implements Plugin<PresentationUtilPluginSetup, PresentationUtilPluginStart> {
  public setup(core: CoreSetup): PresentationUtilPluginSetup {
    return {};
  }

  public start(core: CoreStart): PresentationUtilPluginStart {
    return {};
  }

  public stop() {}
}

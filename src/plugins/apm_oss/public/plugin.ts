/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, Plugin } from 'kibana/public';
import { ApmOssPluginSetup, ApmOssPluginStart } from './types';

export class ApmOssPlugin implements Plugin<ApmOssPluginSetup, ApmOssPluginStart> {
  public setup(core: CoreSetup): ApmOssPluginSetup {
    return {};
  }

  public start(core: CoreStart): ApmOssPluginStart {
    return {};
  }

  public stop() {}
}

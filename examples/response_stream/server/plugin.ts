/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Plugin, CoreSetup, CoreStart } from '@kbn/core/server';

// eslint-disable-next-line
export interface ResponseStreamSetupPlugins {}

// eslint-disable-next-line
export interface ResponseStreamStartPlugins {}

export class ResponseStreamPlugin implements Plugin {
  public setup(core: CoreSetup, plugins: ResponseStreamSetupPlugins) {}

  public start(core: CoreStart, plugins: ResponseStreamStartPlugins) {}

  public stop() {}
}

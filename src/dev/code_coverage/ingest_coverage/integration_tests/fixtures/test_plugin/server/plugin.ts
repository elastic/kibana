/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup } from '@kbn/core/server';

export class Plugin {
  constructor() {}

  public setup(core: CoreSetup) {}

  public start() {
    // called after all plugins are set up
  }

  public stop() {
    // called when plugin is torn down during Kibana's shutdown sequence
  }
}

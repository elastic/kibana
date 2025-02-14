/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Plugin, CoreSetup, PluginInitializerContext } from '@kbn/core/server';

export class CorePluginInitializerContextPlugin implements Plugin {
  readonly initializerContext: PluginInitializerContext;

  constructor(initializerContext: PluginInitializerContext) {
    this.initializerContext = initializerContext;
  }

  public setup(core: CoreSetup, deps: {}) {
    const router = core.http.createRouter();
    router.get(
      {
        path: '/core_plugin_initializer_context/node/roles',
        validate: false,
        options: {
          authRequired: false,
        },
      },
      async (context, req, res) => {
        return res.ok({ body: this.initializerContext.node.roles });
      }
    );
  }

  public start() {}
  public stop() {}
}

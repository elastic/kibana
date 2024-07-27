/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';
import { combineLatest } from 'rxjs';

import { defineRoutes } from './routes';

export class FeatureFlagsExamplePlugin implements Plugin {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router);
  }

  public start(core: CoreStart) {
    // Promise form: when we need to fetch it once, like in an HTTP request
    void Promise.all([
      core.featureFlags.getBooleanValue('example-boolean', false),
      core.featureFlags.getStringValue('example-string', 'white'),
      core.featureFlags.getNumberValue('example-number', 1),
    ]).then(([bool, str, num]) => {
      this.logger.info(`The feature flags are:
      - example-boolean: ${bool}
      - example-string: ${str}
      - example-number: ${num}
      `);
    });

    // Observable form: when we need to react to the changes
    combineLatest([
      core.featureFlags.getBooleanValue$('example-boolean', false),
      core.featureFlags.getStringValue$('example-string', 'red'),
      core.featureFlags.getNumberValue$('example-number', 1),
    ]).subscribe(([bool, str, num]) => {
      this.logger.info(`The observed feature flags are:
      - example-boolean: ${bool}
      - example-string: ${str}
      - example-number: ${num}
      `);
    });
  }

  public stop() {}
}

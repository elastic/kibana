/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';
import { combineLatest } from 'rxjs';

import {
  FeatureFlagExampleBoolean,
  FeatureFlagExampleNumber,
  FeatureFlagExampleString,
} from '../common/feature_flags';
import { defineRoutes } from './routes';

export class FeatureFlagsExamplePlugin implements Plugin {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup, plugins: any) {
    const router = core.http.createRouter();
    console.log('FeatureFlagsExamplePluginA: SetupALA');

    // Register server side APIs
    defineRoutes(router);
  }

  public start(core: CoreStart, plugins: any) {
    setInterval(() => {
      plugins.workflows.pushEvent('detection-rule', {
        ruleId: '123',
        ruleName: 'Example Detection Rule',
        timestamp: new Date().toISOString(),
        severity: 'high',
        description: 'This is an example detection rule that was triggered.',
        additionalData: {
          user: 'jdoe',
          ip: '109.87.123.433',
          action: 'login',
          location: 'New York, USA',
        },
      });
    }, 10000);
    // Promise form: when we need to fetch it once, like in an HTTP request
    void Promise.all([
      core.featureFlags.getBooleanValue(FeatureFlagExampleBoolean, false),
      core.featureFlags.getStringValue(FeatureFlagExampleString, 'white'),
      core.featureFlags.getNumberValue(FeatureFlagExampleNumber, 1),
    ]).then(([bool, str, num]) => {
      this.logger.info(`The feature flags are:
      - ${FeatureFlagExampleBoolean}: ${bool}
      - ${FeatureFlagExampleString}: ${str}
      - ${FeatureFlagExampleNumber}: ${num}
      `);
    });

    // Observable form: when we need to react to the changes
    combineLatest([
      core.featureFlags.getBooleanValue$(FeatureFlagExampleBoolean, false),
      core.featureFlags.getStringValue$(FeatureFlagExampleString, 'red'),
      core.featureFlags.getNumberValue$(FeatureFlagExampleNumber, 1),
    ]).subscribe(([bool, str, num]) => {
      this.logger.info(`The observed feature flags are:
      - ${FeatureFlagExampleBoolean}: ${bool}
      - ${FeatureFlagExampleString}: ${str}
      - ${FeatureFlagExampleNumber}: ${num}
      `);
    });
  }

  public stop() {}
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Service } from '@kbn/cordis';
import type { Context } from '@kbn/cordis';
import { defineRoutes } from './routes';

// Migrated to native Cordis authoring — Stage 5 of the Cordis migration.
export default class FeatureFlagsExamplePlugin extends Service {
  static readonly inject = ['core.http'];
  static readonly provide = 'featureFlagsExample';

  constructor(ctx: Context) {
    super(ctx, 'featureFlagsExample');
    const router = (ctx.get('core.http') as any).createRouter();

        // Register server side APIs
        defineRoutes(router);
    // TODO: start() had a non-empty body — migrate manually:
    // {
    //     // Promise form: when we need to fetch it once, like in an HTTP request
    //     void Promise.all([
    //       core.featureFlags.getBooleanValue(FeatureFlagExampleBoolean, false),
    //       core.featureFlags.getStringValue(FeatureFlagExampleString, 'white'),
    //       core.featureFlags.getNumberValue(FeatureFlagExampleNumber, 1),
    //     ]).then(([bool, str, num]) => {
    //       this.logger.info(`The feature flags are:
    //       - ${FeatureFlagExampleBoolean}: ${bool}
    //       - ${FeatureFlagExampleString}: ${str}
    //       - ${FeatureFlagExampleNumber}: ${num}
    //       `);
    //     });
    // 
    //     // Observable form: when we need to react to the changes
    //     combineLatest([
    //       core.featureFlags.getBooleanValue$(FeatureFlagExampleBoolean, false),
    //       core.featureFlags.getStringValue$(FeatureFlagExampleString, 'red'),
    //       core.featureFlags.getNumberValue$(FeatureFlagExampleNumber, 1),
    //     ]).subscribe(([bool, str, num]) => {
    //       this.logger.info(`The observed feature flags are:
    //       - ${FeatureFlagExampleBoolean}: ${bool}
    //       - ${FeatureFlagExampleString}: ${str}
    //       - ${FeatureFlagExampleNumber}: ${num}
    //       `);
    //     });
    //   }
  }
}

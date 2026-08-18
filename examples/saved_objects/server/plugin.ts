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
import { typeA, typeB } from './saved_objects';
import { registerSearchExampleRoutes } from './search_example_routes';
import { registerEsqlExampleRoutes } from './esql_example_routes';

// Migrated to native Cordis authoring — Stage 5 of the Cordis migration.
export default class SavedObjectsExamplePlugin extends Service {
  static readonly inject = ['core.savedObjects', 'core.http'];
  static readonly provide = 'savedObjectsExample';

  constructor(ctx: Context) {
    super(ctx, 'savedObjectsExample');
    const savedObjects = ctx.get('core.savedObjects') as any;
    const http = ctx.get('core.http') as any;
    const logger = (ctx.get('core.logger') as any).get('plugins', 'savedObjects');

    savedObjects.registerType(typeA);
    savedObjects.registerType(typeB);
    const router = http.createRouter();
    registerSearchExampleRoutes(router, logger);
    registerEsqlExampleRoutes(router, logger);
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter } from '@kbn/core/server';
import { registerIndicesRoute } from './indices';
import { registerFieldsRoute } from './fields';
import { registerSearchRoute } from './search';
import { registerFieldStatsRoute } from './field_stats';
import { registerSavedObjectTypesRoute } from './saved_object_types';
import { registerSavedObjectsRoute } from './saved_objects';
import { registerSavedObjectRoute } from './saved_object';

export function registerRoutes(router: IRouter) {
  registerIndicesRoute(router);
  registerFieldsRoute(router);
  registerSearchRoute(router);
  registerFieldStatsRoute(router);
  registerSavedObjectTypesRoute(router);
  registerSavedObjectsRoute(router);
  registerSavedObjectRoute(router);
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter, Logger } from '@kbn/core/server';
import { registerGetMiniAppsRoute } from './get_mini_apps';
import { registerGetMiniAppByIdRoute } from './get_mini_app_by_id';
import { registerCreateMiniAppRoute } from './create_mini_app';
import { registerUpdateMiniAppRoute } from './update_mini_app';
import { registerDeleteMiniAppRoute } from './delete_mini_app';

export function defineRoutes(router: IRouter, logger: Logger) {
  registerGetMiniAppsRoute(router, logger);
  registerGetMiniAppByIdRoute(router, logger);
  registerCreateMiniAppRoute(router, logger);
  registerUpdateMiniAppRoute(router, logger);
  registerDeleteMiniAppRoute(router, logger);
}

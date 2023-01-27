/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IRouter } from '@kbn/core/server';
import { registerBulkDeleteRoute } from './bulk_delete';
import { registerCreateRoute } from './create';
import { registerDeleteRoute } from './delete';
import { registerFindRoute } from './find';
import { registerGetRoute } from './get';
import { registerUpdateRoute } from './update';

export const registerKbnClientSoRoutes = (router: IRouter) => {
  registerBulkDeleteRoute(router);
  registerCreateRoute(router);
  registerDeleteRoute(router);
  registerFindRoute(router);
  registerGetRoute(router);
  registerUpdateRoute(router);
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IRouter } from '../../../http';
import { catchAndReturnBoomErrors } from '../utils';

export const registerDeleteUnknownTypesRoute = (router: IRouter) => {
  router.post(
    {
      path: '/deprecations/_delete_unknown_types',
      validate: false,
    },
    catchAndReturnBoomErrors(async (context, req, res) => {
      // TODO: actually peform the action.
      return res.ok({
        body: {
          success: true,
        },
      });
    })
  );
};

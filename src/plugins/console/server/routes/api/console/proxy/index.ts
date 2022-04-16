/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { routeValidationConfig } from './validation_config';
import { createHandler } from './create_handler';

import { RouteDependencies } from '../../..';

export const registerProxyRoute = (deps: RouteDependencies) => {
  deps.router.post(
    {
      path: '/api/console/proxy',
      options: {
        tags: ['access:console'],
        body: {
          output: 'stream',
          parse: false,
        },
      },
      validate: routeValidationConfig,
    },
    createHandler(deps)
  );
};

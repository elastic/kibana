/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { RANDOM_NUMBER_ROUTE_PATH } from '../../common';

import { IRouter } from '../../../../src/core/server';

/**
 *
 * @param router Registers a get route that returns a random number between one and ten. It has no input
 * parameters, and returns a random number in the body.
 */
export function registerGetRandomNumberRoute(router: IRouter) {
  router.get(
    {
      path: RANDOM_NUMBER_ROUTE_PATH,
      validate: {},
    },
    async (context, request, response) => {
      return response.ok({
        body: {
          randomNumber: Math.random() * 10,
        },
      });
    }
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DeprecationsGetResponse } from '@kbn/core-deprecations-common';
import type { InternalDeprecationRouter } from '../internal_types';

export const registerGetRoute = (router: InternalDeprecationRouter) => {
  router.get(
    {
      path: '/',
      validate: false,
    },
    async (context, req, res) => {
      const deprecationsClient = (await context.core).deprecations.client;

      const body: DeprecationsGetResponse = {
        deprecations: await deprecationsClient.getAllDeprecations(),
      };

      return res.ok({ body });
    }
  );
};

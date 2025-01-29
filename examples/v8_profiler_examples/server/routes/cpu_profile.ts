/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { Logger, IRouter } from '@kbn/core/server';
import { startProfiling } from '../lib/cpu_profile';
import { handleRoute } from './common';

const routeValidation = {
  query: schema.object({
    // seconds to run the profile
    duration: schema.number({ defaultValue: 5 }),
    // microseconds, v8 default is 1000
    interval: schema.number({ defaultValue: 1000 }),
  }),
};

const routeConfig = {
  path: '/_dev/cpu_profile',
  validate: routeValidation,
};

export function registerRoute(logger: Logger, router: IRouter): void {
  router.get(routeConfig, async (context, request, response) => {
    const { duration, interval } = request.query;
    const args = {
      interval,
    };

    return await handleRoute(startProfiling, args, logger, response, duration, 'cpu');
  });
}

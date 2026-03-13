/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, IRouter } from '@kbn/core/server';

import { registerCpuProfileRoute } from './cpu_profile';
import { registerMemoryProfileRoute } from './memory_profile';

export const registerRoutes = (logger: Logger, router: IRouter): void => {
  registerCpuProfileRoute(logger, router);
  registerMemoryProfileRoute(logger, router);
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { InternalHttpServiceSetup } from '../../http';
import { registerGetRoute } from './get';
import { DeprecationsFactory } from '../deprecations_factory';

export function registerRoutes({
  http,
  deprecationsFactory,
}: {
  http: InternalHttpServiceSetup;
  deprecationsFactory: DeprecationsFactory;
}) {
  const router = http.createRouter('/api/deprecations');
  registerGetRoute(router, { deprecationsFactory });
}

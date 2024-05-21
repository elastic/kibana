/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ContainerModule } from 'inversify';
import { Route } from '@kbn/core-http-server';
import { Global } from '@kbn/core-di-common';
import { EchoRoute } from './route';
import { EchoService } from './service';

export const module = new ContainerModule((bind) => {
  bind(EchoService).toSelf().inRequestScope();
  bind(EchoRoute).toSelf().inRequestScope();

  bind(Global).toConstantValue(EchoService);
  bind(Route).toConstantValue(EchoRoute);
});

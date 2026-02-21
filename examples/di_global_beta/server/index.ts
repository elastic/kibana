/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { declareServices } from '@kbn/core-di';
import { Route } from '@kbn/core-di-server';
import { BetaServiceToken } from '@kbn/di-global-beta-types';
import { BetaService } from './beta_service';
import { BetaRoute } from './route';

export const services = declareServices(({ bind, publish }) => {
  publish(BetaServiceToken).to(BetaService);
  bind(Route).toConstantValue(BetaRoute);
});

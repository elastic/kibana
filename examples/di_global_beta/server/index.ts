/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Route } from '@kbn/core-di-server';
import { BetaServiceToken } from '@kbn/di-global-beta-types';
import { declare, implementedBy } from '@kbn/plugin-di';
import { BetaService } from './beta_service';
import { BetaRoute } from './route';

/**
 * Registers the Beta plugin's DI bindings.
 *
 * `BetaServiceToken` is bound directly to the injectable {@link BetaService}
 * class, so InversifyJS constructs and injects it on first resolution.
 * The {@link Route} binding registers {@link BetaRoute} as this plugin's
 * HTTP handler.
 */
export const services = declare(({ bind, provide }) => {
  provide(BetaServiceToken, implementedBy(BetaService));
  bind(Route).toConstantValue(BetaRoute);
});

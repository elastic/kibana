/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createTokenFactory } from '@kbn/plugin-di';

const betaTokens = createTokenFactory('diGlobalBeta');

/**
 * Contract for the Beta service, shared as a cross-plugin service.
 */
export interface IBetaService {
  /** Returns a greeting that identifies the Beta plugin. */
  greet(): string;
}

/**
 * Service token for {@link IBetaService}.
 *
 * Consumers `@injectService(BetaServiceToken)` to receive the implementation
 * without declaring a plugin dependency on the Beta plugin.
 */
export const BetaServiceToken = betaTokens.service<IBetaService>('BetaService');

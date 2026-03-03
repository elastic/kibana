/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createToken } from '@kbn/core-di';

/**
 * Contract for the Alpha service, published globally via {@link Global}.
 */
export interface IAlphaService {
  /** Returns a greeting that identifies the Alpha plugin. */
  greet(): string;
}

/**
 * Injection token for {@link IAlphaService}.
 *
 * Consumers `@inject(AlphaServiceToken)` to receive the implementation
 * without declaring a plugin dependency on the Alpha plugin.
 */
export const AlphaServiceToken = createToken<IAlphaService>('diGlobalAlpha.AlphaService');

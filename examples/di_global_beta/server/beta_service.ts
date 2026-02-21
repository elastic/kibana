/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { injectable } from '@kbn/core-di';
import type { IBetaService } from '@kbn/di-global-beta-types';

/**
 * Injectable implementation of {@link IBetaService}.
 *
 * Bound to {@link BetaServiceToken} in the Beta plugin's DI module and
 * resolved by any plugin that injects that token.
 */
@injectable()
export class BetaService implements IBetaService {
  public greet(): string {
    return 'Hello from Beta';
  }
}

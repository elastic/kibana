/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Plugin, CoreSetup, CoreStart } from '@kbn/core/server';
import type { IAlphaService } from '@kbn/di-global-alpha-types';

/**
 * Classic plugin that returns the `IAlphaService` contract from `start()`.
 *
 * The DI module in `index.ts` publishes this contract globally via the
 * `Start` token, which the platform auto-bridges into the DI container
 * after the classic `start()` resolves.
 */
export class DiGlobalAlphaPlugin implements Plugin<void, IAlphaService> {
  public setup(_core: CoreSetup) {}

  public start(_core: CoreStart): IAlphaService {
    return {
      greet: () => 'Hello from Alpha',
    };
  }

  public stop() {}
}

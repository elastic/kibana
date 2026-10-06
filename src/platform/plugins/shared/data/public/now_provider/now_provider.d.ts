/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
export type NowProviderInternalContract = PublicMethodsOf<NowProvider>;
export type NowProviderPublicContract = Pick<NowProviderInternalContract, 'get'>;
/**
 * Used to synchronize time between parallel searches with relative time range that rely on `now`.
 */
export declare class NowProvider {
  private readonly nowFromUrl;
  private now?;
  constructor();
  get(): Date;
  set(now: Date): void;
  reset(): void;
}

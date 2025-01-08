/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PublicMethodsOf } from '@kbn/utility-types';
import { getForceNowFromUrl } from './lib';

export type NowProviderInternalContract = PublicMethodsOf<NowProvider>;
export type NowProviderPublicContract = Pick<NowProviderInternalContract, 'get'>;

/**
 * Used to synchronize time between parallel searches with relative time range that rely on `now`.
 */
export class NowProvider {
  // TODO: service shouldn't access params in the URL
  // instead it should be handled by apps
  private readonly nowFromUrl = getForceNowFromUrl();
  private now?: Date;

  constructor() {}

  get(): Date {
    if (this.nowFromUrl) return this.nowFromUrl; // now forced from URL always takes precedence
    if (this.now) return this.now;
    return new Date();
  }

  set(now: Date) {
    this.now = now;
  }

  reset() {
    this.now = undefined;
  }
}

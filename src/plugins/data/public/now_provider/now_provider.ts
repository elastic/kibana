/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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

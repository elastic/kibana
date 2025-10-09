/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';

export interface EsSpecResponse {
  es?: {
    endpoints?: Record<string, unknown>;
  };
}

export class ConsoleSpecClient {
  private esSpecCache?: EsSpecResponse;
  private esSpecPromise?: Promise<EsSpecResponse>;

  constructor(private readonly http: HttpStart) {}

  public getEsSpec() {
    if (this.esSpecCache) {
      return Promise.resolve(this.esSpecCache);
    }
    if (this.esSpecPromise) {
      return this.esSpecPromise;
    }
    this.esSpecPromise = this.http
      .get<EsSpecResponse>('/api/console/api_server')
      .then((res) => {
        this.esSpecCache = res;
        this.esSpecPromise = undefined;
        return res;
      })
      .catch((err) => {
        this.esSpecPromise = undefined;
        throw err;
      });
    return this.esSpecPromise;
  }
}

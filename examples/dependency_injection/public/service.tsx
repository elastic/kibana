/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { inject, injectable } from 'inversify';
import { CoreStart } from '@kbn/core-di-browser';
import type { HttpStart } from '@kbn/core-http-browser';

@injectable()
export class EchoService {
  constructor(@inject(CoreStart('http')) private readonly http: HttpStart) {}

  public echo(message: string): Promise<string> {
    return this.http.post<string>('/api/di/echo', {
      body: JSON.stringify(message),
    });
  }
}

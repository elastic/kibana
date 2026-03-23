/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { inject, injectable } from 'inversify';
import type { Type } from '@kbn/config-schema';
import { Request } from '@kbn/core-di-server';
import type { KibanaRequest } from '@kbn/core-http-server';

export type EchoRequest = KibanaRequest<never, never, Type<string>>;

@injectable()
export class Echo {
  constructor(@inject(Request) private readonly request: EchoRequest) {}

  echo() {
    return this.request.body;
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { inject } from 'inversify';
import { remotable } from '@kbn/core-remote-common';
import { EchoToken, type EchoApi } from './tokens';

@remotable()
export class EchoStep {
  constructor(@inject(EchoToken) private readonly echo: EchoApi) {}

  async run(): Promise<{ marker: string }> {
    const where = await this.echo.where();
    return { marker: where.marker };
  }
}

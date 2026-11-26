/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { inject, injectable } from 'inversify';
import { ExtensionService } from '@kbn/core-di';
import { Response } from '@kbn/core-di-server';
import type { KibanaResponseFactory } from '@kbn/core-http-server';
import { LookupBRequestGreeter } from '@kbn/di-soft-dependencies-example-tokens';
import { LookupStatusService, PLUGIN_ID } from '../common';

@injectable()
export class StatusRoute {
  static method = 'get' as const;
  static path = `/api/di_soft_deps/${PLUGIN_ID}`;
  static validate = false as const;
  static options = {
    access: 'internal',
  } as const;
  static security = {
    authz: {
      enabled: false,
      reason: 'This route is opted out of authorization as it is a developer example endpoint.',
    },
  } as const;

  constructor(
    @inject(LookupStatusService) private readonly status: LookupStatusService,
    @inject(ExtensionService) private readonly extensionService: ExtensionService,
    @inject(Response) private readonly response: KibanaResponseFactory
  ) {}

  handle() {
    const requestGreeting =
      this.extensionService.get(LookupBRequestGreeter)?.greet() ?? 'diSoftDepsLookupB is disabled';

    return this.response.ok({ body: { ...this.status.getStatus(), requestGreeting } });
  }
}

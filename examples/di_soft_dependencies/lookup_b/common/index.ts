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
import { LookupAGreeter } from '@kbn/di-soft-dependencies-example-tokens';

export const PLUGIN_ID = 'diSoftDepsLookupB';

export interface LookupStatus {
  id: string;
  fromLookupA: string;
}

@injectable()
export class LookupStatusService {
  constructor(@inject(ExtensionService) private readonly extensionService: ExtensionService) {}

  getStatus(): LookupStatus {
    const greeter = this.extensionService.get(LookupAGreeter);

    return {
      id: PLUGIN_ID,
      fromLookupA: greeter?.greet() ?? 'diSoftDepsLookupA is disabled',
    };
  }
}

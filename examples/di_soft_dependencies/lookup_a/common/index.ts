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
import { LookupBGreeter } from '@kbn/di-soft-dependencies-example-tokens';

export const PLUGIN_ID = 'diSoftDepsLookupA';

export interface LookupStatus {
  id: string;
  fromLookupB: string;
}

@injectable()
export class LookupStatusService {
  constructor(@inject(ExtensionService) private readonly extensionService: ExtensionService) {}

  getStatus(): LookupStatus {
    const greeter = this.extensionService.get(LookupBGreeter);

    return {
      id: PLUGIN_ID,
      fromLookupB: greeter?.greet() ?? 'diSoftDepsLookupB is disabled',
    };
  }
}

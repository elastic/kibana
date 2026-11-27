/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { injectable } from 'inversify';
import type { RegistryEntry } from '@kbn/di-soft-dependencies-example-tokens';

export const PLUGIN_ID = 'diSoftDepsRegistryA';

export interface RegistryStatus {
  id: string;
  entries: RegistryEntry[];
}

@injectable()
export class Registry {
  private readonly entries: RegistryEntry[] = [];

  register(entry: RegistryEntry): void {
    this.entries.push(entry);
  }

  getStatus(): RegistryStatus {
    return { id: PLUGIN_ID, entries: [...this.entries] };
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApiBodyEntry } from '../types';

/** Holds one API body entry per saved object type. */
export class ApiBodyRegistry {
  private readonly entries = new Map<string, ApiBodyEntry>();

  public register<Body extends object, Attributes>(
    type: string,
    entry: ApiBodyEntry<Body, Attributes>
  ): void {
    if (this.entries.has(type)) {
      throw new Error(`An API body entry is already registered for saved object type [${type}]`);
    }
    this.entries.set(type, entry);
  }

  public get(type: string): ApiBodyEntry | undefined {
    return this.entries.get(type);
  }
}

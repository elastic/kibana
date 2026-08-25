/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ESQLFieldWithMetadata } from '@kbn/esql-types';

export class QueryColumnsCache {
  private readonly entries = new Map<string, Promise<ESQLFieldWithMetadata[]>>();

  public get(query: string): Promise<ESQLFieldWithMetadata[]> | undefined {
    return this.entries.get(query.toLowerCase());
  }

  public set(query: string, value: Promise<ESQLFieldWithMetadata[]>): void {
    this.entries.set(query.toLowerCase(), value);
  }

  public delete(query: string): void {
    this.entries.delete(query.toLowerCase());
  }
}

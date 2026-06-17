/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InternalHttpSetup } from '@kbn/core-http-browser-internal';

const BASE_PATH = '/internal/user_storage';

/**
 * Thin HTTP wrapper over the user-storage internal routes. Each method maps
 * to one HTTP round-trip; no caching.
 *
 * @internal
 */
export class UserStorageApi {
  constructor(private readonly http: InternalHttpSetup) {}

  public async get(key: string): Promise<unknown> {
    const response = await this.http.get<{ value: unknown }>(
      `${BASE_PATH}/${encodeURIComponent(key)}`
    );
    return response.value;
  }

  public async set(key: string, value: unknown): Promise<unknown> {
    const response = await this.http.put<{ value: unknown }>(
      `${BASE_PATH}/${encodeURIComponent(key)}`,
      { body: JSON.stringify({ value }) }
    );
    return response.value;
  }

  public async remove(key: string): Promise<void> {
    await this.http.delete(`${BASE_PATH}/${encodeURIComponent(key)}`);
  }
}

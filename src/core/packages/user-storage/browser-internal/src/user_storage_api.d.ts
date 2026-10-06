/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InternalHttpSetup } from '@kbn/core-http-browser-internal';
/**
 * Thin HTTP wrapper over the user-storage internal routes. Each method maps
 * to one HTTP round-trip; no caching.
 *
 * @internal
 */
export declare class UserStorageApi {
  private readonly http;
  constructor(http: InternalHttpSetup);
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<unknown>;
  remove(key: string): Promise<void>;
}

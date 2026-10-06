/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest, IBasePath } from '@kbn/core-http-server';
/**
 * Core internal implementation of {@link IBasePath}
 *
 * @internal
 */
export declare class BasePath implements IBasePath {
  readonly serverBasePath: string;
  readonly publicBaseUrl?: string;
  constructor(serverBasePath?: string, publicBaseUrl?: string);
  get: (request: KibanaRequest) => string;
  prepend: (path: string) => string;
  remove: (path: string) => string;
}
